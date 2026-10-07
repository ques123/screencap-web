import "server-only";
import {
	DeleteObjectsCommand,
	ListObjectsV2Command,
	S3Client,
} from "@aws-sdk/client-s3";
import { db } from "@cap/database";
import {
	importedVideos,
	screencapRemovedVideos,
	screencapReports,
	users,
	videoProcessingJobs,
	videos,
	videoUploads,
	videoViews,
} from "@cap/database/schema";
import { serverEnv } from "@cap/env";
import {
	and,
	desc,
	eq,
	getTableColumns,
	inArray,
	isNotNull,
	like,
	lte,
	or,
	sql,
} from "drizzle-orm";
import { isE2eeVideo } from "@/lib/e2ee";
import { logAdminAction, telegramAlert } from "./audit";
import { sendRemovalNotice } from "./notices";
import type {
	ActionInput,
	ActionResult,
	AdminRecordingRow,
	RemovedRow,
	RemovedState,
} from "./types";

const DAY_MS = 24 * 3600 * 1000;
const UNDO_DAYS = 7;

function likePattern(q: string): string {
	return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/** Revives a JSON snapshot of a row (Dates became strings) so it can be re-inserted. */
export function snapshotToRow(
	snapshot: Record<string, unknown>,
	table: "videos" | "video_uploads",
): Record<string, unknown> {
	const cols = getTableColumns(table === "videos" ? videos : videoUploads);
	const out: Record<string, unknown> = {};
	for (const [key, col] of Object.entries(cols)) {
		if (!(key in snapshot)) continue;
		if ((col as { generated?: unknown }).generated) continue;
		const value = snapshot[key];
		const type = String((col as { columnType?: string }).columnType ?? "");
		if (
			(type.includes("Timestamp") || type.includes("Date")) &&
			typeof value === "string"
		) {
			const d = new Date(value);
			out[key] = Number.isNaN(d.getTime()) ? null : d;
		} else {
			out[key] = value;
		}
	}
	return out;
}

export async function listRecordings(opts: {
	q?: string;
	ownerId?: string;
	limit?: number;
	offset?: number;
}): Promise<{ rows: AdminRecordingRow[]; total: number }> {
	const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
	const offset = Math.max(opts.offset ?? 0, 0);
	const q = opts.q?.trim();
	const conds = [];
	if (opts.ownerId)
		conds.push(
			eq(videos.ownerId, opts.ownerId as typeof videos.$inferSelect.ownerId),
		);
	if (q) {
		const p = likePattern(q);
		conds.push(
			or(
				eq(videos.id, q as typeof videos.$inferSelect.id),
				like(videos.name, p),
				like(users.email, p),
			),
		);
	}
	const where = conds.length ? and(...conds) : undefined;
	const [rows, [tot]] = await Promise.all([
		db()
			.select({
				id: videos.id,
				title: videos.name,
				ownerId: videos.ownerId,
				ownerEmail: users.email,
				createdAt: videos.createdAt,
				durationSeconds: videos.duration,
				public: videos.public,
				views:
					sql<number>`(SELECT COUNT(*) FROM ${videoViews} WHERE ${videoViews.videoId} = ${videos.id})`.mapWith(
						Number,
					),
				openReports:
					sql<number>`(SELECT COUNT(*) FROM ${screencapReports} WHERE ${screencapReports.videoId} = ${videos.id} AND ${screencapReports.status} = 'open')`.mapWith(
						Number,
					),
				e2ee: videos.e2ee,
				hasReporterKey:
					sql<number>`EXISTS (SELECT 1 FROM ${screencapReports} WHERE ${screencapReports.videoId} = ${videos.id} AND ${screencapReports.decryptionKey} IS NOT NULL)`.mapWith(
						Number,
					),
			})
			.from(videos)
			.leftJoin(users, eq(users.id, videos.ownerId))
			.where(where)
			.orderBy(desc(videos.createdAt))
			.limit(limit)
			.offset(offset),
		db()
			.select({ n: sql<number>`COUNT(*)`.mapWith(Number) })
			.from(videos)
			.leftJoin(users, eq(users.id, videos.ownerId))
			.where(where),
	]);
	return {
		rows: rows.map((r) => ({
			...r,
			id: String(r.id),
			ownerId: String(r.ownerId),
			e2ee: isE2eeVideo(r),
			hasReporterKey: Boolean(r.hasReporterKey),
		})),
		total: tot?.n ?? 0,
	};
}

export async function listRemoved(opts?: {
	states?: RemovedState[];
}): Promise<RemovedRow[]> {
	const states = opts?.states ?? ["removed", "quarantined"];
	const rows = await db()
		.select()
		.from(screencapRemovedVideos)
		.where(inArray(screencapRemovedVideos.state, states))
		.orderBy(desc(screencapRemovedVideos.removedAt));
	const now = Date.now();
	return rows.map((r) => ({
		videoId: String(r.videoId),
		ownerId: r.ownerId ? String(r.ownerId) : null,
		ownerEmail: r.ownerEmail,
		title: r.title,
		state: r.state,
		reason: r.reason,
		source: r.source,
		removedBy: r.removedBy,
		removedAt: r.removedAt,
		purgeAfter: r.purgeAfter,
		resolvedAt: r.resolvedAt,
		daysLeft: r.purgeAfter
			? Math.max(0, Math.ceil((r.purgeAfter.getTime() - now) / DAY_MS))
			: null,
	}));
}

/** Like removeRecording but without the Telegram alert; used by bulk flows that alert once. */
async function escalateToQuarantine(
	videoId: string,
	a: ActionInput,
): Promise<ActionResult> {
	const [res] = await db()
		.update(screencapRemovedVideos)
		.set({
			state: "quarantined",
			purgeAfter: null,
			reason: a.reason ?? null,
			source: a.source ?? "own",
		})
		.where(
			and(
				eq(
					screencapRemovedVideos.videoId,
					videoId as typeof screencapRemovedVideos.$inferSelect.videoId,
				),
				eq(screencapRemovedVideos.state, "removed"),
			),
		);
	if ((res as { affectedRows?: number }).affectedRows !== 1)
		return {
			ok: false,
			error: "Recording not found, or not in the removed list.",
		};
	const [row] = await db()
		.select({
			ownerId: screencapRemovedVideos.ownerId,
			ownerEmail: screencapRemovedVideos.ownerEmail,
			title: screencapRemovedVideos.title,
		})
		.from(screencapRemovedVideos)
		.where(
			eq(
				screencapRemovedVideos.videoId,
				videoId as typeof screencapRemovedVideos.$inferSelect.videoId,
			),
		)
		.limit(1);
	if (row?.ownerId) {
		const { blockUser } = await import("./users");
		await blockUser(String(row.ownerId), {
			adminEmail: a.adminEmail,
			reason: a.reason ?? "Quarantined content",
			source: a.source,
			notify: false,
		});
	}
	await logAdminAction({
		adminEmail: a.adminEmail,
		action: "recording.quarantine",
		targetType: "recording",
		targetId: videoId,
		targetLabel: row?.title ?? null,
		reason: a.reason ?? null,
		source: a.source ?? null,
		details: {
			escalatedFromRemoved: true,
			ownerEmail: row?.ownerEmail ?? null,
		},
	});
	await telegramAlert(
		`Screencap admin: QUARANTINED removed recording ${videoId} (${row?.title ?? ""}), owner ${row?.ownerEmail ?? row?.ownerId ?? "?"}. Purge stopped. By ${a.adminEmail}.`,
	);
	return {
		ok: true,
		message:
			"Quarantined: the files will not be purged and the owner is blocked. Report it to NCMEC.",
	};
}

export async function removeRecordingInternal(
	videoId: string,
	a: ActionInput & { quarantine?: boolean },
	opts: { quiet?: boolean } = {},
): Promise<ActionResult> {
	try {
		const [video] = await db()
			.select()
			.from(videos)
			.where(eq(videos.id, videoId as typeof videos.$inferSelect.id))
			.limit(1);
		if (!video) {
			// Already removed: a quarantine request escalates it (stops the purge, blocks the owner).
			if (a.quarantine === true) return escalateToQuarantine(videoId, a);
			return { ok: false, error: "Recording not found, or already removed." };
		}
		const uploads = await db()
			.select()
			.from(videoUploads)
			.where(eq(videoUploads.videoId, video.id));
		const [owner] = await db()
			.select({ email: users.email })
			.from(users)
			.where(eq(users.id, video.ownerId))
			.limit(1);

		const quarantine = a.quarantine === true;
		const now = new Date();
		const snapshot = JSON.parse(JSON.stringify({ video, uploads })) as {
			video: Record<string, unknown>;
			uploads: Record<string, unknown>[];
		};
		const values = {
			videoId: video.id,
			ownerId: video.ownerId,
			ownerEmail: owner?.email ?? null,
			title: video.name.slice(0, 255),
			snapshot,
			state: (quarantine ? "quarantined" : "removed") as RemovedState,
			reason: a.reason ?? null,
			source: a.source ?? "own",
			removedBy: a.adminEmail,
			removedAt: now,
			purgeAfter: quarantine
				? null
				: new Date(now.getTime() + UNDO_DAYS * DAY_MS),
			resolvedAt: null,
		};
		await db().transaction(async (tx) => {
			await tx
				.insert(screencapRemovedVideos)
				.values(values)
				.onDuplicateKeyUpdate({ set: values });
			await tx.delete(videoUploads).where(eq(videoUploads.videoId, video.id));
			const [res] = await tx.delete(videos).where(eq(videos.id, video.id));
			if ((res as { affectedRows?: number }).affectedRows === 0)
				throw new Error("already removed");
		});

		if (quarantine && video.ownerId) {
			const { blockUser } = await import("./users");
			await blockUser(String(video.ownerId), {
				adminEmail: a.adminEmail,
				reason: a.reason ?? "Quarantined content",
				source: a.source,
				notify: false,
			});
		}

		let notified = false;
		if (a.notify && owner?.email && a.reason) {
			const base = serverEnv().WEB_URL;
			notified = await sendRemovalNotice({
				kind: "recording",
				to: owner.email,
				title: video.name,
				link: `${base}/s/${video.id}`,
				reason: a.reason,
				source: a.source ?? "own",
			});
		}
		await logAdminAction({
			adminEmail: a.adminEmail,
			action: quarantine ? "recording.quarantine" : "recording.remove",
			targetType: "recording",
			targetId: String(video.id),
			targetLabel: video.name,
			reason: a.reason ?? null,
			source: a.source ?? null,
			notified,
			details: { ownerId: video.ownerId, ownerEmail: owner?.email ?? null },
		});
		if (!opts.quiet)
			await telegramAlert(
				`Screencap admin: ${quarantine ? "QUARANTINED" : "removed"} recording ${video.id} (${video.name}) owned by ${owner?.email ?? video.ownerId}. By ${a.adminEmail}. Reason: ${a.reason ?? "none"}`,
			);
		return {
			ok: true,
			message: quarantine
				? "Recording quarantined and the owner blocked. It will not be purged automatically."
				: `Recording removed. You can restore it for ${UNDO_DAYS} days.`,
			notified,
		};
	} catch (error) {
		console.error("[screencap-admin] removeRecording failed", error);
		return { ok: false, error: "Could not remove the recording." };
	}
}

export async function removeRecording(
	videoId: string,
	a: ActionInput & { quarantine?: boolean },
): Promise<ActionResult> {
	return removeRecordingInternal(videoId, a);
}

export async function restoreRecording(
	videoId: string,
	adminEmail: string,
	opts: { force?: boolean } = {},
): Promise<ActionResult> {
	try {
		const [row] = await db()
			.select()
			.from(screencapRemovedVideos)
			.where(
				and(
					eq(
						screencapRemovedVideos.videoId,
						videoId as typeof screencapRemovedVideos.$inferSelect.videoId,
					),
					inArray(screencapRemovedVideos.state, ["removed", "quarantined"]),
				),
			)
			.limit(1);
		if (!row)
			return { ok: false, error: "Nothing to restore for that recording." };
		// Quarantined content is evidence: restoring it must be deliberate.
		if (row.state === "quarantined" && !opts.force)
			return {
				ok: false,
				error: "This recording is quarantined. Confirm the restore explicitly.",
			};
		const [existing] = await db()
			.select({ id: videos.id })
			.from(videos)
			.where(eq(videos.id, row.videoId))
			.limit(1);
		if (existing)
			return { ok: false, error: "That recording already exists again." };

		const videoRow = snapshotToRow(row.snapshot.video, "videos");
		// Never bring a recording back public for a blocked owner, or after a quarantine.
		const { isUserBlocked } = await import("./users");
		const ownerBlocked = row.ownerId
			? await isUserBlocked({ id: String(row.ownerId) })
			: false;
		if (ownerBlocked || row.state === "quarantined") videoRow.public = false;
		const uploadRows = row.snapshot.uploads.map((u) =>
			snapshotToRow(u, "video_uploads"),
		);
		await db().transaction(async (tx) => {
			await tx.insert(videos).values(videoRow as typeof videos.$inferInsert);
			for (const u of uploadRows)
				await tx
					.insert(videoUploads)
					.values(u as typeof videoUploads.$inferInsert);
			await tx
				.update(screencapRemovedVideos)
				.set({ state: "restored", resolvedAt: new Date() })
				.where(eq(screencapRemovedVideos.videoId, row.videoId));
		});
		await logAdminAction({
			adminEmail,
			action: "recording.restore",
			targetType: "recording",
			targetId: String(row.videoId),
			targetLabel: row.title,
			details: { wasQuarantined: row.state === "quarantined" },
		});
		return { ok: true, message: "Recording restored." };
	} catch (error) {
		console.error("[screencap-admin] restoreRecording failed", error);
		return { ok: false, error: "Could not restore the recording." };
	}
}

export async function setRecordingPublic(
	videoId: string,
	isPublic: boolean,
	adminEmail: string,
): Promise<ActionResult> {
	try {
		const [video] = await db()
			.select({ id: videos.id, name: videos.name })
			.from(videos)
			.where(eq(videos.id, videoId as typeof videos.$inferSelect.id))
			.limit(1);
		if (!video) return { ok: false, error: "Recording not found." };
		await db()
			.update(videos)
			.set({ public: isPublic })
			.where(eq(videos.id, video.id));
		await logAdminAction({
			adminEmail,
			action: isPublic ? "recording.public" : "recording.private",
			targetType: "recording",
			targetId: String(video.id),
			targetLabel: video.name,
		});
		return {
			ok: true,
			message: isPublic ? "Recording is public." : "Recording is private.",
		};
	} catch (error) {
		console.error("[screencap-admin] setRecordingPublic failed", error);
		return { ok: false, error: "Could not change the recording." };
	}
}

function s3(): { client: S3Client; bucket: string } {
	const env = serverEnv();
	return {
		bucket: env.CAP_AWS_BUCKET,
		client: new S3Client({
			region: env.CAP_AWS_REGION,
			endpoint: env.S3_INTERNAL_ENDPOINT || undefined,
			forcePathStyle: env.S3_PATH_STYLE,
			credentials:
				env.CAP_AWS_ACCESS_KEY && env.CAP_AWS_SECRET_KEY
					? {
							accessKeyId: env.CAP_AWS_ACCESS_KEY,
							secretAccessKey: env.CAP_AWS_SECRET_KEY,
						}
					: undefined,
		}),
	};
}

async function deletePrefix(prefix: string): Promise<number> {
	const { client, bucket } = s3();
	let deleted = 0;
	let token: string | undefined;
	do {
		const listed = await client.send(
			new ListObjectsV2Command({
				Bucket: bucket,
				Prefix: prefix,
				ContinuationToken: token,
			}),
		);
		const keys = (listed.Contents ?? []).flatMap((c) => (c.Key ? [c.Key] : []));
		if (keys.some((k) => !k.startsWith(prefix)))
			throw new Error("Storage returned an unexpected key");
		if (keys.length) {
			const res = await client.send(
				new DeleteObjectsCommand({
					Bucket: bucket,
					Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
				}),
			);
			if (res.Errors?.length)
				throw new Error(res.Errors[0]?.Message ?? "Delete failed");
			deleted += keys.length;
		}
		token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
	} while (token);
	return deleted;
}

export async function purgeDue(opts?: {
	dryRun?: boolean;
	now?: Date;
}): Promise<{
	purged: string[];
	failed: { videoId: string; error: string }[];
	dryRun?: boolean;
	wouldPurge?: string[];
}> {
	const dryRun =
		opts?.dryRun === true || serverEnv().SCREENCAP_PURGE_DRY_RUN === "1";
	const now = opts?.now ?? new Date();
	const due = await db()
		.select()
		.from(screencapRemovedVideos)
		.where(
			and(
				eq(screencapRemovedVideos.state, "removed"),
				isNotNull(screencapRemovedVideos.purgeAfter),
				lte(screencapRemovedVideos.purgeAfter, now),
			),
		);
	const purged: string[] = [];
	const failed: { videoId: string; error: string }[] = [];
	const wouldPurge: string[] = [];
	for (const row of due) {
		const id = String(row.videoId);
		try {
			if (!row.ownerId || !/^[A-Za-z0-9]+$/.test(id))
				throw new Error("Missing owner id, refusing to build a storage prefix");
			const video = row.snapshot.video;
			if (video.bucket || video.storageIntegrationId)
				throw new Error("Recording uses custom storage; purge it by hand");
			if (dryRun) {
				console.log(`[screencap-admin] dry run: would purge ${id}`);
				wouldPurge.push(id);
				continue;
			}
			// Claim the row first so a restore or quarantine that lands now can't race the delete.
			const [claim] = await db()
				.update(screencapRemovedVideos)
				.set({ state: "purging" })
				.where(
					and(
						eq(screencapRemovedVideos.videoId, row.videoId),
						eq(screencapRemovedVideos.state, "removed"),
					),
				);
			if ((claim as { affectedRows?: number }).affectedRows !== 1) continue;
			try {
				await deletePrefix(`${row.ownerId}/${id}/`);
			} catch (error) {
				await db()
					.update(screencapRemovedVideos)
					.set({ state: "removed" })
					.where(eq(screencapRemovedVideos.videoId, row.videoId));
				throw error;
			}
			await db().transaction(async (tx) => {
				await tx.delete(videoViews).where(eq(videoViews.videoId, row.videoId));
				await tx
					.delete(videoProcessingJobs)
					.where(eq(videoProcessingJobs.videoId, row.videoId));
				await tx.delete(importedVideos).where(eq(importedVideos.id, id));
				await tx
					.update(screencapRemovedVideos)
					.set({ state: "purged", resolvedAt: new Date() })
					.where(eq(screencapRemovedVideos.videoId, row.videoId));
			});
			purged.push(id);
			await logAdminAction({
				adminEmail: "system:purge",
				action: "recording.purge",
				targetType: "recording",
				targetId: id,
				targetLabel: row.title,
			});
		} catch (error) {
			failed.push({
				videoId: id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	if (failed.length)
		await telegramAlert(
			`Screencap purge: ${failed.length} failed (${failed.map((f) => f.videoId).join(", ")}). First error: ${failed[0]?.error}`,
		);
	return { purged, failed, ...(dryRun ? { dryRun, wouldPurge } : {}) };
}

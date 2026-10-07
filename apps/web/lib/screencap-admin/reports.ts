import { decrypt } from "@cap/database/crypto";
import "server-only";
import { db } from "@cap/database";
import {
	screencapRemovedVideos,
	screencapReports,
	videos,
} from "@cap/database/schema";
import { Video } from "@cap/web-domain";
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { firstMatchingKey, isE2eeVideo } from "@/lib/e2ee";
import { logAdminAction, writeAdminLogStrict } from "./audit";
import type { ActionResult, AdminReportRow } from "./types";

const clip = (v: string | null, n: number) =>
	v === null ? null : v.slice(0, n);

/** Stores a user report. Never throws. */
export async function createReport(r: {
	videoId: string;
	videoTitle: string | null;
	ownerId: string | null;
	ownerEmail: string | null;
	reason: string;
	details: string | null;
	reporterEmail: string | null;
	country: string;
	decryptionKey?: string | null;
}): Promise<void> {
	try {
		await db()
			.insert(screencapReports)
			.values({
				videoId: r.videoId.slice(0, 15),
				videoTitle: clip(r.videoTitle, 255),
				ownerId: clip(r.ownerId, 15),
				ownerEmail: clip(r.ownerEmail, 255),
				reason: r.reason.slice(0, 64),
				details: r.details,
				reporterEmail: clip(r.reporterEmail, 255),
				country: r.country.slice(0, 8),
				decryptionKey: r.decryptionKey ?? null,
			});
	} catch (error) {
		console.error("[screencap-admin] createReport failed", error);
	}
}

export async function listReports(opts: {
	status?: "open" | "actioned" | "dismissed" | "all";
	limit?: number;
}): Promise<AdminReportRow[]> {
	const status = opts.status ?? "open";
	const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
	const query = db()
		.select({
			report: screencapReports,
			removedState: screencapRemovedVideos.state,
			videoE2ee: videos.e2ee,
			keyIncluded:
				sql<number>`${screencapReports.decryptionKey} IS NOT NULL`.mapWith(
					Number,
				),
		})
		.from(screencapReports)
		.leftJoin(videos, eq(videos.id, sql`${screencapReports.videoId}`))
		.leftJoin(
			screencapRemovedVideos,
			and(
				eq(screencapRemovedVideos.videoId, sql`${screencapReports.videoId}`),
				inArray(screencapRemovedVideos.state, ["removed", "quarantined"]),
			),
		);
	const rows = await (status === "all"
		? query
		: query.where(eq(screencapReports.status, status))
	)
		.orderBy(desc(screencapReports.id))
		.limit(limit);
	return rows.map(({ report: r, removedState, videoE2ee, keyIncluded }) => ({
		id: r.id,
		videoId: r.videoId,
		videoTitle: r.videoTitle,
		ownerId: r.ownerId,
		ownerEmail: r.ownerEmail,
		reason: r.reason,
		details: r.details,
		reporterEmail: r.reporterEmail,
		country: r.country,
		status: r.status,
		adminNote: r.adminNote,
		createdAt: r.createdAt,
		resolvedAt: r.resolvedAt,
		resolvedBy: r.resolvedBy,
		recordingRemoved: removedState !== null,
		e2ee: isE2eeVideo({ e2ee: videoE2ee }),
		keyIncluded: Boolean(keyIncluded),
	}));
}

/** Marks every open report about one recording as actioned (after it was removed or quarantined). */
export async function resolveOpenReportsForVideo(
	videoId: string,
	adminEmail: string,
	note?: string,
): Promise<void> {
	try {
		await db()
			.update(screencapReports)
			.set({
				status: "actioned",
				resolvedAt: new Date(),
				resolvedBy: adminEmail,
				...(note ? { adminNote: note } : {}),
			})
			.where(
				and(
					eq(screencapReports.videoId, videoId),
					eq(screencapReports.status, "open"),
				),
			);
	} catch (error) {
		console.error("[screencap-admin] resolveOpenReportsForVideo failed", error);
	}
}

export async function resolveReport(
	id: number,
	status: "actioned" | "dismissed",
	adminEmail: string,
	note?: string,
): Promise<ActionResult> {
	try {
		const [row] = await db()
			.select()
			.from(screencapReports)
			.where(eq(screencapReports.id, id))
			.limit(1);
		if (!row) return { ok: false, error: "Report not found." };
		await db()
			.update(screencapReports)
			.set({
				status,
				adminNote: note?.trim() ? note.trim() : row.adminNote,
				resolvedAt: new Date(),
				resolvedBy: adminEmail,
			})
			.where(eq(screencapReports.id, id));
		await logAdminAction({
			adminEmail,
			action: `report.${status}`,
			targetType: "report",
			targetId: String(id),
			targetLabel: row.videoTitle ?? row.videoId,
			reason: note ?? null,
			details: { videoId: row.videoId },
		});
		return {
			ok: true,
			message:
				status === "actioned"
					? "Report marked as actioned."
					: "Report dismissed.",
		};
	} catch (error) {
		console.error("[screencap-admin] resolveReport failed", error);
		return { ok: false, error: "Could not update the report." };
	}
}

export async function openReportCount(): Promise<number> {
	try {
		const [row] = await db()
			.select({ n: sql<number>`COUNT(*)`.mapWith(Number) })
			.from(screencapReports)
			.where(eq(screencapReports.status, "open"));
		return row?.n ?? 0;
	} catch {
		return 0;
	}
}

export async function getReporterKey(
	videoId: string,
	reportId?: number,
): Promise<{
	key: string;
	reportId: number;
	videoTitle: string | null;
} | null> {
	try {
		const [video] = await db()
			.select({ keyFingerprint: videos.keyFingerprint })
			.from(videos)
			.where(eq(videos.id, Video.VideoId.make(videoId)))
			.limit(1);
		if (!video?.keyFingerprint) return null;
		const rows = await db()
			.select({
				id: screencapReports.id,
				key: screencapReports.decryptionKey,
				videoTitle: screencapReports.videoTitle,
			})
			.from(screencapReports)
			.where(
				and(
					eq(screencapReports.videoId, videoId),
					isNotNull(screencapReports.decryptionKey),
					reportId === undefined
						? undefined
						: eq(screencapReports.id, reportId),
				),
			)
			.orderBy(desc(screencapReports.id))
			.limit(50);
		const decrypted: { id: number; key: string; videoTitle: string | null }[] =
			[];
		for (const row of rows) {
			if (!row.key) continue;
			try {
				decrypted.push({
					id: row.id,
					key: await decrypt(row.key),
					videoTitle: row.videoTitle,
				});
			} catch {}
		}
		const match = firstMatchingKey(decrypted, video.keyFingerprint);
		if (!match) return null;
		return { key: match.key, reportId: match.id, videoTitle: match.videoTitle };
	} catch (error) {
		console.error("[screencap-admin] getReporterKey failed", error);
		return null;
	}
}

/** Logs the view, then returns the share URL path with the reporter's key. Throws (releasing nothing) if the log write fails. The key is never written to the log. */
export async function openWithReporterKey(
	videoId: string,
	adminEmail: string,
	reportId?: number,
): Promise<string | null> {
	const found = await getReporterKey(videoId, reportId);
	if (!found) return null;
	try {
		await writeAdminLogStrict({
			adminEmail,
			action: "view-with-reporter-key",
			targetType: "recording",
			targetId: videoId,
			targetLabel: found.videoTitle,
			source: "report",
			details: { reportId: found.reportId },
		});
	} catch (error) {
		console.error("[screencap-admin] could not record key view", error);
		throw new Error("Could not record this view");
	}
	return `/s/${encodeURIComponent(videoId)}#k=${found.key}`;
}

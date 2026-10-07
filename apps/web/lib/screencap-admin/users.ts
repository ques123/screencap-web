import "server-only";
import { db } from "@cap/database";
import {
	agentApiKeys,
	authApiKeys,
	mcpOAuthTokens,
	screencapUserAdmin,
	users,
	videos,
} from "@cap/database/schema";
import { and, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { isAdminEmail } from "./access";
import { logAdminAction, telegramAlert } from "./audit";
import { sendRemovalNotice } from "./notices";
import { listRecordings, removeRecordingInternal } from "./recordings";
import { getSettings } from "./settings";
import type {
	ActionInput,
	ActionResult,
	AdminUserDetail,
	AdminUserRow,
} from "./types";

const REVOKED = "screencap_revoked";

type UserId = typeof users.$inferSelect.id;

function likePattern(q: string): string {
	return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

async function findUser(userId: string) {
	const [u] = await db()
		.select()
		.from(users)
		.where(eq(users.id, userId as UserId))
		.limit(1);
	return u ?? null;
}

async function upsertAdminRow(
	userId: string,
	set: Partial<typeof screencapUserAdmin.$inferInsert>,
) {
	await db()
		.insert(screencapUserAdmin)
		.values({ userId: userId as UserId, ...set })
		.onDuplicateKeyUpdate({ set });
}

const userSelect = {
	id: users.id,
	email: users.email,
	name: users.name,
	createdAt: users.created_at,
	stripeSubscriptionStatus: users.stripeSubscriptionStatus,
	blockedAt: screencapUserAdmin.blockedAt,
	recordings:
		sql<number>`(SELECT COUNT(*) FROM ${videos} WHERE ${videos.ownerId} = ${users.id})`.mapWith(
			Number,
		),
	storedSeconds:
		sql<number>`(SELECT COALESCE(SUM(${videos.duration}), 0) FROM ${videos} WHERE ${videos.ownerId} = ${users.id})`.mapWith(
			Number,
		),
	lastActiveAt: sql<
		Date | string | null
	>`(SELECT MAX(${videos.createdAt}) FROM ${videos} WHERE ${videos.ownerId} = ${users.id})`,
};

type UserSelectRow = {
	id: string;
	email: string;
	name: string | null;
	createdAt: Date;
	stripeSubscriptionStatus: string | null;
	blockedAt: Date | null;
	recordings: number;
	storedSeconds: number;
	lastActiveAt: Date | string | null;
};

function toRow(r: UserSelectRow): AdminUserRow {
	return {
		id: String(r.id),
		email: r.email,
		name: r.name,
		createdAt: r.createdAt,
		recordings: r.recordings,
		storedSeconds: r.storedSeconds,
		lastActiveAt: r.lastActiveAt ? new Date(r.lastActiveAt) : null,
		blocked: r.blockedAt !== null,
		proRevoked: r.stripeSubscriptionStatus === REVOKED,
	};
}

export async function listUsers(opts: {
	q?: string;
	limit?: number;
	offset?: number;
}): Promise<{ rows: AdminUserRow[]; total: number }> {
	const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
	const offset = Math.max(opts.offset ?? 0, 0);
	const q = opts.q?.trim();
	const where = q
		? or(
				eq(users.id, q as UserId),
				like(users.email, likePattern(q)),
				like(users.name, likePattern(q)),
			)
		: undefined;
	const [rows, [tot]] = await Promise.all([
		db()
			.select(userSelect)
			.from(users)
			.leftJoin(screencapUserAdmin, eq(screencapUserAdmin.userId, users.id))
			.where(where)
			.orderBy(desc(users.created_at))
			.limit(limit)
			.offset(offset),
		db()
			.select({ n: sql<number>`COUNT(*)`.mapWith(Number) })
			.from(users)
			.where(where),
	]);
	return {
		rows: rows.map((r) => toRow(r as unknown as UserSelectRow)),
		total: tot?.n ?? 0,
	};
}

export async function getUserDetail(
	userId: string,
): Promise<AdminUserDetail | null> {
	const [row] = await db()
		.select(userSelect)
		.from(users)
		.leftJoin(screencapUserAdmin, eq(screencapUserAdmin.userId, users.id))
		.where(eq(users.id, userId as UserId))
		.limit(1);
	if (!row) return null;
	const [admin] = await db()
		.select()
		.from(screencapUserAdmin)
		.where(eq(screencapUserAdmin.userId, userId as UserId))
		.limit(1);
	const [recent, settings] = await Promise.all([
		listRecordings({ ownerId: userId, limit: 50 }),
		getSettings(),
	]);
	const storageOverride = admin?.storageHoursOverride ?? null;
	const recordingOverride = admin?.recordingMinutesOverride ?? null;
	return {
		...toRow(row as unknown as UserSelectRow),
		blockedAt: admin?.blockedAt ?? null,
		blockReason: admin?.blockReason ?? null,
		storageHoursOverride: storageOverride,
		recordingMinutesOverride: recordingOverride,
		note: admin?.note ?? null,
		recentRecordings: recent.rows,
		limits: {
			storageHours: storageOverride ?? settings.maxStorageHours,
			recordingMinutes: recordingOverride ?? settings.maxRecordingMinutes,
			storageFromOverride: storageOverride !== null,
			recordingFromOverride: recordingOverride !== null,
		},
	};
}

/** Marks blocked, signs out every session and hides all their recordings. No logging. */
type Tx = Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0];

// Browser sessions die with authSessionVersion; the desktop app, API keys, agent keys and MCP tokens
// authenticate separately, so they are removed or revoked too.
async function revokeCredentials(tx: Tx, userId: string) {
	const now = new Date();
	await tx.delete(authApiKeys).where(eq(authApiKeys.userId, userId as UserId));
	await tx
		.update(agentApiKeys)
		.set({ revokedAt: now })
		.where(
			and(
				eq(agentApiKeys.userId, userId as UserId),
				isNull(agentApiKeys.revokedAt),
			),
		);
	await tx
		.update(mcpOAuthTokens)
		.set({ revokedAt: now })
		.where(
			and(
				eq(mcpOAuthTokens.userId, userId as UserId),
				isNull(mcpOAuthTokens.revokedAt),
			),
		);
}

async function applyBlock(userId: string, reason: string | null) {
	await db().transaction(async (tx) => {
		await revokeCredentials(tx, userId);
		const now = new Date();
		await tx
			.insert(screencapUserAdmin)
			.values({ userId: userId as UserId, blockedAt: now, blockReason: reason })
			.onDuplicateKeyUpdate({ set: { blockedAt: now, blockReason: reason } });
		await tx
			.update(users)
			.set({ authSessionVersion: sql`${users.authSessionVersion} + 1` })
			.where(eq(users.id, userId as UserId));
		await tx
			.update(videos)
			.set({ public: false })
			.where(eq(videos.ownerId, userId as UserId));
	});
}

export async function blockUser(
	userId: string,
	a: ActionInput,
): Promise<ActionResult> {
	try {
		const user = await findUser(userId);
		if (!user) return { ok: false, error: "User not found." };
		if (isAdminEmail(user.email))
			return { ok: false, error: "Admins cannot be blocked from the panel." };
		await applyBlock(userId, a.reason ?? null);
		let notified = false;
		if (a.notify && a.reason)
			notified = await sendRemovalNotice({
				kind: "account",
				to: user.email,
				reason: a.reason,
				source: a.source ?? "own",
			});
		await logAdminAction({
			adminEmail: a.adminEmail,
			action: "user.block",
			targetType: "user",
			targetId: userId,
			targetLabel: user.email,
			reason: a.reason ?? null,
			source: a.source ?? null,
			notified,
		});
		await telegramAlert(
			`Screencap admin: blocked ${user.email} by ${a.adminEmail}. Reason: ${a.reason ?? "none"}`,
		);
		return {
			ok: true,
			message:
				"User blocked, signed out everywhere, and recordings made private.",
			notified,
		};
	} catch (error) {
		console.error("[screencap-admin] blockUser failed", error);
		return { ok: false, error: "Could not block the user." };
	}
}

export async function unblockUser(
	userId: string,
	a: Omit<ActionInput, "notify">,
): Promise<ActionResult> {
	try {
		const user = await findUser(userId);
		if (!user) return { ok: false, error: "User not found." };
		await upsertAdminRow(userId, { blockedAt: null, blockReason: null });
		await logAdminAction({
			adminEmail: a.adminEmail,
			action: "user.unblock",
			targetType: "user",
			targetId: userId,
			targetLabel: user.email,
			reason: a.reason ?? null,
		});
		return {
			ok: true,
			message:
				"User unblocked. Their recordings stay private until they change them.",
		};
	} catch (error) {
		console.error("[screencap-admin] unblockUser failed", error);
		return { ok: false, error: "Could not unblock the user." };
	}
}

export async function signOutEverywhere(
	userId: string,
	adminEmail: string,
): Promise<ActionResult> {
	try {
		const user = await findUser(userId);
		if (!user) return { ok: false, error: "User not found." };
		await db().transaction(async (tx) => {
			await tx
				.update(users)
				.set({ authSessionVersion: sql`${users.authSessionVersion} + 1` })
				.where(eq(users.id, userId as UserId));
			await revokeCredentials(tx, userId);
		});
		await logAdminAction({
			adminEmail,
			action: "user.signout",
			targetType: "user",
			targetId: userId,
			targetLabel: user.email,
		});
		return {
			ok: true,
			message:
				"Signed out of every session, including the Mac app and API keys.",
		};
	} catch (error) {
		console.error("[screencap-admin] signOutEverywhere failed", error);
		return { ok: false, error: "Could not sign the user out." };
	}
}

export async function deleteAccount(
	userId: string,
	a: ActionInput,
): Promise<ActionResult> {
	try {
		const user = await findUser(userId);
		if (!user) return { ok: false, error: "User not found." };
		if (isAdminEmail(user.email))
			return { ok: false, error: "Admins cannot be deleted from the panel." };
		const owned = await db()
			.select({ id: videos.id })
			.from(videos)
			.where(eq(videos.ownerId, userId as UserId));
		let removed = 0;
		const failures: string[] = [];
		for (const v of owned) {
			const res = await removeRecordingInternal(
				String(v.id),
				{
					adminEmail: a.adminEmail,
					reason: a.reason,
					source: a.source,
					notify: false,
				},
				{ quiet: true },
			);
			if (res.ok) removed += 1;
			else failures.push(String(v.id));
		}
		await applyBlock(userId, a.reason ?? "Account removed");
		let notified = false;
		if (a.notify && a.reason)
			notified = await sendRemovalNotice({
				kind: "account",
				to: user.email,
				reason: a.reason,
				source: a.source ?? "own",
			});
		await logAdminAction({
			adminEmail: a.adminEmail,
			action: "user.delete",
			targetType: "user",
			targetId: userId,
			targetLabel: user.email,
			reason: a.reason ?? null,
			source: a.source ?? null,
			notified,
			details: { recordingsRemoved: removed, failed: failures },
		});
		await telegramAlert(
			`Screencap admin: deleted account ${user.email} (${removed} recordings removed) by ${a.adminEmail}. Reason: ${a.reason ?? "none"}`,
		);
		if (failures.length)
			return {
				ok: false,
				error: `Account blocked, but ${failures.length} recording(s) could not be removed. Try again.`,
			};
		return {
			ok: true,
			message: `Account blocked and ${removed} recording(s) removed. They can be restored for 7 days.`,
			notified,
		};
	} catch (error) {
		console.error("[screencap-admin] deleteAccount failed", error);
		return { ok: false, error: "Could not delete the account." };
	}
}

function validOverride(v: number | null): boolean {
	return v === null || (Number.isInteger(v) && v > 0 && v < 10_000_000);
}

export async function setUserOverrides(
	userId: string,
	o: {
		storageHoursOverride: number | null;
		recordingMinutesOverride: number | null;
		note?: string | null;
	},
	adminEmail: string,
): Promise<ActionResult> {
	try {
		if (
			!validOverride(o.storageHoursOverride) ||
			!validOverride(o.recordingMinutesOverride)
		)
			return {
				ok: false,
				error:
					"Limits must be whole numbers above 0, or empty to use the default.",
			};
		const user = await findUser(userId);
		if (!user) return { ok: false, error: "User not found." };
		const set: Partial<typeof screencapUserAdmin.$inferInsert> = {
			storageHoursOverride: o.storageHoursOverride,
			recordingMinutesOverride: o.recordingMinutesOverride,
		};
		if (o.note !== undefined) set.note = o.note?.trim() ? o.note.trim() : null;
		await upsertAdminRow(userId, set);
		await logAdminAction({
			adminEmail,
			action: "user.limits",
			targetType: "user",
			targetId: userId,
			targetLabel: user.email,
			details: {
				storageHoursOverride: o.storageHoursOverride,
				recordingMinutesOverride: o.recordingMinutesOverride,
			},
		});
		return { ok: true, message: "Limits saved." };
	} catch (error) {
		console.error("[screencap-admin] setUserOverrides failed", error);
		return { ok: false, error: "Could not save the limits." };
	}
}

export async function setProRevoked(
	userId: string,
	revoked: boolean,
	adminEmail: string,
): Promise<ActionResult> {
	try {
		const user = await findUser(userId);
		if (!user) return { ok: false, error: "User not found." };
		await db()
			.update(users)
			.set({ stripeSubscriptionStatus: revoked ? REVOKED : null })
			.where(eq(users.id, userId as UserId));
		await logAdminAction({
			adminEmail,
			action: revoked ? "user.pro_revoke" : "user.pro_restore",
			targetType: "user",
			targetId: userId,
			targetLabel: user.email,
		});
		return {
			ok: true,
			message: revoked ? "Pro revoked." : "Pro restored.",
		};
	} catch (error) {
		console.error("[screencap-admin] setProRevoked failed", error);
		return { ok: false, error: "Could not change Pro." };
	}
}

export async function isUserBlocked(u: {
	id?: string;
	email?: string;
}): Promise<boolean> {
	try {
		let id = u.id;
		if (!id && u.email) {
			const email = u.email.trim().toLowerCase();
			const settings = await getSettings();
			const domain = email.split("@")[1] ?? "";
			if (
				settings.blockedEmails.includes(email) ||
				settings.blockedEmails.includes(domain)
			)
				return true;
			const [found] = await db()
				.select({ id: users.id })
				.from(users)
				.where(eq(users.email, email))
				.limit(1);
			id = found ? String(found.id) : undefined;
		}
		if (!id) return false;
		const [row] = await db()
			.select({ blockedAt: screencapUserAdmin.blockedAt })
			.from(screencapUserAdmin)
			.where(and(eq(screencapUserAdmin.userId, id as UserId)))
			.limit(1);
		return Boolean(row?.blockedAt);
	} catch {
		return false;
	}
}

export { getUserLimitOverrides } from "./limit-overrides";

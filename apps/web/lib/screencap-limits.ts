import { db } from "@cap/database";
import { videos } from "@cap/database/schema";
import { serverEnv } from "@cap/env";
import { eq, sql } from "drizzle-orm";

/** Error code returned to clients. Deliberately not "upgrade_required", which triggers Cap's upgrade UI. */
export const RECORDING_LIMIT_ERROR = "recording_limit";

export function parseLimit(value: string | undefined | null): number | null {
	if (value === undefined || value === null) return null;
	const trimmed = value.trim();
	if (!/^\d+$/.test(trimmed)) return null;
	const n = Number(trimmed);
	return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function maxRecordingSeconds(): number | null {
	return parseLimit(serverEnv().SCREENCAP_MAX_RECORDING_SECONDS);
}

export function maxStorageSeconds(): number | null {
	return parseLimit(serverEnv().SCREENCAP_MAX_STORAGE_SECONDS);
}

function formatHours(seconds: number): string {
	const hours = seconds / 3600;
	return String(Number.isInteger(hours) ? hours : Math.round(hours * 10) / 10);
}

function formatMinutes(seconds: number): string {
	const minutes = seconds / 60;
	return String(
		Number.isInteger(minutes) ? minutes : Math.round(minutes * 10) / 10,
	);
}

export function storageFullMessage(limitSeconds: number): string {
	return `You've used your ${formatHours(limitSeconds)} hours of free storage. Delete some recordings to make room.`;
}

export function recordingTooLongMessage(limitSeconds: number): string {
	return `Recordings can be up to ${formatMinutes(limitSeconds)} minutes during the free beta.`;
}

export type LimitCheck =
	| { ok: true }
	| {
			ok: false;
			code: "storage_full" | "recording_too_long";
			message: string;
	  };

export async function getStoredSecondsForUser(userId: string): Promise<number> {
	const [row] = await db()
		.select({
			total: sql<string | number | null>`COALESCE(SUM(${videos.duration}), 0)`,
		})
		.from(videos)
		.where(eq(videos.ownerId, userId as typeof videos.$inferSelect.ownerId));
	const total = Number(row?.total ?? 0);
	return Number.isFinite(total) ? total : 0;
}

export async function checkCanCreateRecording(
	userId: string,
): Promise<LimitCheck> {
	const limit = maxStorageSeconds();
	if (limit === null) return { ok: true };
	const stored = await getStoredSecondsForUser(userId);
	if (stored >= limit)
		return { ok: false, code: "storage_full", message: storageFullMessage(limit) };
	return { ok: true };
}

/**
 * `graceSeconds` covers stop/finalize latency for honest recorders that stop at the cap.
 */
export function checkRecordingLength(
	seconds: number | null | undefined,
	graceSeconds = 0,
): LimitCheck {
	const limit = maxRecordingSeconds();
	if (limit === null) return { ok: true };
	if (
		typeof seconds === "number" &&
		Number.isFinite(seconds) &&
		seconds > limit + graceSeconds
	)
		return {
			ok: false,
			code: "recording_too_long",
			message: recordingTooLongMessage(limit),
		};
	return { ok: true };
}

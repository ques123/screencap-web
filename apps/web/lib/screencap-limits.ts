import { db } from "@cap/database";
import { videos } from "@cap/database/schema";
import {
	getSettings,
	getSettingsSync,
	type ScreencapSettings,
} from "@cap/database/screencap-settings";
import { eq, sql } from "drizzle-orm";
import { getUserLimitOverrides } from "@/lib/screencap-admin/limit-overrides";

/** Error code returned to clients. Deliberately not "upgrade_required", which triggers Cap's upgrade UI. */
export const RECORDING_LIMIT_ERROR = "recording_limit";

export function parseLimit(value: string | undefined | null): number | null {
	if (value === undefined || value === null) return null;
	const trimmed = value.trim();
	if (!/^\d+$/.test(trimmed)) return null;
	const n = Number(trimmed);
	return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function positiveOrNull(n: number | null | undefined): number | null {
	return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
}

// The settings already merge the admin panel (wins) with the env vars (fallback), so null here means
// "no limit" (set in the panel, or no env var). The sync readers use the cached snapshot; the async
// ones wait for a fresh load, so the first request after a restart never sees a stale limit.
const recordingSecondsFrom = (s: ScreencapSettings) => {
	const minutes = positiveOrNull(s.maxRecordingMinutes);
	return minutes === null ? null : Math.round(minutes * 60);
};
const storageSecondsFrom = (s: ScreencapSettings) => {
	const hours = positiveOrNull(s.maxStorageHours);
	return hours === null ? null : Math.round(hours * 3600);
};

export function maxRecordingSeconds(): number | null {
	return recordingSecondsFrom(getSettingsSync());
}

export function maxStorageSeconds(): number | null {
	return storageSecondsFrom(getSettingsSync());
}

async function freshRecordingSeconds(): Promise<number | null> {
	return recordingSecondsFrom(await getSettings());
}

async function freshStorageSeconds(): Promise<number | null> {
	return storageSecondsFrom(await getSettings());
}

// Per-user overrides set in the admin panel. Never throws: on any failure the
// global limit applies.
async function userOverrides(userId: string | undefined) {
	if (!userId)
		return { storageHoursOverride: null, recordingMinutesOverride: null };
	try {
		return await getUserLimitOverrides(userId);
	} catch (error) {
		console.warn("[limits] could not load user overrides", error);
		return { storageHoursOverride: null, recordingMinutesOverride: null };
	}
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
	return `You've used your ${formatHours(limitSeconds)} hours of storage. Delete some recordings to make room.`;
}

export function recordingTooLongMessage(limitSeconds: number): string {
	return `Recordings can be up to ${formatMinutes(limitSeconds)} minutes.`;
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
	const overrides = await userOverrides(userId);
	const hours = positiveOrNull(overrides.storageHoursOverride);
	const limit =
		hours !== null ? Math.round(hours * 3600) : await freshStorageSeconds();
	if (limit === null) return { ok: true };
	const stored = await getStoredSecondsForUser(userId);
	if (stored >= limit)
		return {
			ok: false,
			code: "storage_full",
			message: storageFullMessage(limit),
		};
	return { ok: true };
}

/** The recording limit that applies to one user (their override, else the site-wide limit). */
export async function maxRecordingSecondsFor(
	userId?: string,
): Promise<number | null> {
	const overrides = await userOverrides(userId);
	const minutes = positiveOrNull(overrides.recordingMinutesOverride);
	return minutes !== null ? Math.round(minutes * 60) : freshRecordingSeconds();
}

/**
 * `graceSeconds` covers stop/finalize latency for honest recorders that stop at the cap.
 */
export async function checkRecordingLength(
	seconds: number | null | undefined,
	graceSeconds = 0,
	userId?: string,
): Promise<LimitCheck> {
	const overrides = await userOverrides(userId);
	const minutes = positiveOrNull(overrides.recordingMinutesOverride);
	const limit =
		minutes !== null ? Math.round(minutes * 60) : await freshRecordingSeconds();
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

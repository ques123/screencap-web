import { serverEnv } from "@cap/env";
import { db } from "./index.ts";
import { screencapSettings } from "./schema.ts";

export type ScreencapSettings = {
	signupMode: "open" | "allowlist";
	allowedDomains: string[];
	blockedEmails: string[];
	blockedCountries: string[];
	maxRecordingMinutes: number | null;
	maxStorageHours: number | null;
};

export type ScreencapSettingKey = keyof ScreencapSettings;

export const SETTING_KEYS: ScreencapSettingKey[] = [
	"signupMode",
	"allowedDomains",
	"blockedEmails",
	"blockedCountries",
	"maxRecordingMinutes",
	"maxStorageHours",
];

export type SettingsEnv = {
	CAP_ALLOWED_SIGNUP_DOMAINS?: string;
	CAP_BLOCKED_SIGNUP_DOMAINS?: string;
	SCREENCAP_SIGNUP_BLOCKED_COUNTRIES?: string;
	SCREENCAP_MAX_RECORDING_SECONDS?: string;
	SCREENCAP_MAX_STORAGE_SECONDS?: string;
};

const CACHE_MS = 30_000;

function splitList(value: string | undefined | null): string[] {
	if (!value) return [];
	return value
		.split(",")
		.map((v) => v.trim().toLowerCase())
		.filter(Boolean);
}

function positiveInt(value: string | undefined | null): number | null {
	if (value === undefined || value === null) return null;
	const trimmed = value.trim();
	if (!/^\d+$/.test(trimmed)) return null;
	const n = Number(trimmed);
	return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** The settings implied by env vars alone (the fallback when no DB row exists). */
export function settingsFromEnv(env: SettingsEnv): ScreencapSettings {
	const allowedDomains = splitList(env.CAP_ALLOWED_SIGNUP_DOMAINS);
	const seconds = positiveInt(env.SCREENCAP_MAX_RECORDING_SECONDS);
	const storageSeconds = positiveInt(env.SCREENCAP_MAX_STORAGE_SECONDS);
	return {
		signupMode: allowedDomains.length > 0 ? "allowlist" : "open",
		allowedDomains,
		blockedEmails: splitList(env.CAP_BLOCKED_SIGNUP_DOMAINS),
		blockedCountries: splitList(env.SCREENCAP_SIGNUP_BLOCKED_COUNTRIES).map(
			(c) => c.toUpperCase(),
		),
		maxRecordingMinutes: seconds === null ? null : seconds / 60,
		maxStorageHours: storageSeconds === null ? null : storageSeconds / 3600,
	};
}

function stringList(value: unknown, upper = false): string[] | null {
	if (!Array.isArray(value)) return null;
	const out = value
		.filter((v): v is string => typeof v === "string")
		.map((v) => v.trim())
		.map((v) => (upper ? v.toUpperCase() : v.toLowerCase()))
		.filter(Boolean);
	return [...new Set(out)];
}

function numberOrNull(value: unknown): number | null | undefined {
	if (value === null) return null;
	if (typeof value === "number" && Number.isFinite(value) && value > 0)
		return value;
	return undefined;
}

/** Overlays DB rows (key -> JSON value) on the env fallback. A row wins over its env var. */
export function mergeSettings(
	env: SettingsEnv,
	rows: Record<string, unknown>,
): ScreencapSettings {
	const out = settingsFromEnv(env);
	const signupMode = rows.signupMode;
	if (signupMode === "open" || signupMode === "allowlist")
		out.signupMode = signupMode;
	const allowed = stringList(rows.allowedDomains);
	if (allowed) out.allowedDomains = allowed;
	const blockedEmails = stringList(rows.blockedEmails);
	if (blockedEmails) out.blockedEmails = blockedEmails;
	const countries = stringList(rows.blockedCountries, true);
	if (countries) out.blockedCountries = countries;
	const rec = numberOrNull(rows.maxRecordingMinutes);
	if (rec !== undefined) out.maxRecordingMinutes = rec;
	const stor = numberOrNull(rows.maxStorageHours);
	if (stor !== undefined) out.maxStorageHours = stor;
	return out;
}

/** Which keys currently have a DB row (so the UI can tell "panel" from "env"). */
export function settingSources(
	rows: Record<string, unknown>,
): Record<ScreencapSettingKey, "panel" | "env"> {
	const result = {} as Record<ScreencapSettingKey, "panel" | "env">;
	for (const key of SETTING_KEYS)
		result[key] = rows[key] !== undefined ? "panel" : "env";
	return result;
}

function readEnv(): SettingsEnv {
	try {
		return serverEnv();
	} catch {
		return process.env as SettingsEnv;
	}
}

let cache: {
	value: ScreencapSettings;
	rows: Record<string, unknown>;
	at: number;
} | null = null;
let inflight: Promise<ScreencapSettings> | null = null;

async function loadRows(): Promise<Record<string, unknown>> {
	const rows = await db().select().from(screencapSettings);
	const map: Record<string, unknown> = {};
	for (const row of rows) map[row.key] = row.value;
	return map;
}

/** Forces a reload from the DB. On failure keeps the previous snapshot (or env fallback). */
export function refreshSettings(): Promise<ScreencapSettings> {
	if (inflight) return inflight;
	inflight = (async () => {
		try {
			const rows = await loadRows();
			cache = {
				value: mergeSettings(readEnv(), rows),
				rows,
				at: Date.now(),
			};
		} catch (e) {
			console.error("screencap settings load failed", e);
			cache = {
				value: cache?.value ?? settingsFromEnv(readEnv()),
				rows: cache?.rows ?? {},
				at: Date.now(),
			};
		} finally {
			inflight = null;
		}
		return cache.value;
	})();
	return inflight;
}

function isStale(): boolean {
	return !cache || Date.now() - cache.at > CACHE_MS;
}

/** Cached snapshot (env fallback before the first load); refreshes in the background when stale. */
export function getSettingsSync(): ScreencapSettings {
	if (isStale()) void refreshSettings();
	return cache?.value ?? settingsFromEnv(readEnv());
}

export async function getSettings(): Promise<ScreencapSettings> {
	if (isStale()) return refreshSettings();
	return (cache as NonNullable<typeof cache>).value;
}

/** Raw rows currently stored, for showing the source of each value. */
export async function getSettingRows(): Promise<Record<string, unknown>> {
	await getSettings();
	return cache?.rows ?? {};
}

export function resetSettingsCacheForTests() {
	cache = null;
	inflight = null;
}

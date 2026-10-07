import "server-only";
import { db } from "@cap/database";
import { screencapSettings } from "@cap/database/schema";
import {
	getSettingRows,
	getSettings,
	getSettingsSync,
	mergeSettings,
	refreshSettings,
	type ScreencapSettingKey,
	type ScreencapSettings,
	settingSources,
} from "@cap/database/screencap-settings";
import { sql } from "drizzle-orm";
import { logAdminAction } from "./audit";

export type { ScreencapSettings };
export { getSettings, getSettingsSync };

const COUNTRY_RE = /^[A-Z]{2}$/;
const DOMAIN_RE = /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanList(
	label: string,
	values: unknown,
	normalize: (v: string) => string,
	valid: (v: string) => boolean,
): string[] {
	if (!Array.isArray(values)) throw new Error(`${label} must be a list`);
	const out: string[] = [];
	for (const raw of values) {
		if (typeof raw !== "string") throw new Error(`${label} must be text`);
		const v = normalize(raw.trim());
		if (!v) continue;
		if (!valid(v)) throw new Error(`${label}: "${raw}" is not valid`);
		if (!out.includes(v)) out.push(v);
	}
	return out;
}

function cleanLimit(label: string, v: unknown): number | null {
	if (v === null) return null;
	if (typeof v !== "number" || !Number.isFinite(v) || v <= 0)
		throw new Error(`${label} must be a number above 0, or empty for no limit`);
	return v;
}

/** Validates and normalises a settings patch. Throws an Error with a plain message. */
export function validateSettingsPatch(
	patch: Partial<ScreencapSettings>,
): Partial<ScreencapSettings> {
	const out: Partial<ScreencapSettings> = {};
	if (patch.signupMode !== undefined) {
		if (patch.signupMode !== "open" && patch.signupMode !== "allowlist")
			throw new Error("Sign-up mode must be open or allowlist");
		out.signupMode = patch.signupMode;
	}
	if (patch.allowedDomains !== undefined)
		out.allowedDomains = cleanList(
			"Allowed domains",
			patch.allowedDomains,
			(v) => v.toLowerCase(),
			(v) => DOMAIN_RE.test(v),
		);
	if (patch.blockedEmails !== undefined)
		out.blockedEmails = cleanList(
			"Blocked emails",
			patch.blockedEmails,
			(v) => v.toLowerCase(),
			(v) => (v.includes("@") ? EMAIL_RE.test(v) : DOMAIN_RE.test(v)),
		);
	if (patch.blockedCountries !== undefined)
		out.blockedCountries = cleanList(
			"Blocked countries",
			patch.blockedCountries,
			(v) => v.toUpperCase(),
			(v) => COUNTRY_RE.test(v),
		);
	if (patch.maxRecordingMinutes !== undefined)
		out.maxRecordingMinutes = cleanLimit(
			"Max recording minutes",
			patch.maxRecordingMinutes,
		);
	if (patch.maxStorageHours !== undefined)
		out.maxStorageHours = cleanLimit(
			"Max storage hours",
			patch.maxStorageHours,
		);
	return out;
}

export async function updateSettings(
	patch: Partial<ScreencapSettings>,
	adminEmail: string,
): Promise<ScreencapSettings> {
	const clean = validateSettingsPatch(patch);
	const keys = Object.keys(clean) as ScreencapSettingKey[];
	for (const key of keys) {
		const raw = clean[key];
		// A JSON null must be written as the JSON literal, not SQL NULL (the column is NOT NULL).
		const value = raw === null ? sql`CAST('null' AS JSON)` : raw;
		await db()
			.insert(screencapSettings)
			.values({ key, value, updatedBy: adminEmail })
			.onDuplicateKeyUpdate({ set: { value, updatedBy: adminEmail } });
	}
	const fresh = await refreshSettings();
	await logAdminAction({
		adminEmail,
		action: "settings.update",
		targetType: "settings",
		targetLabel: keys.join(", ") || null,
		details: { patch: clean },
	});
	return fresh;
}

/** For the settings page: which values come from the panel (DB row) and which from env. */
export async function getSettingSourcesForPanel(): Promise<
	Record<ScreencapSettingKey, "panel" | "env">
> {
	return settingSources(await getSettingRows());
}

export { mergeSettings };

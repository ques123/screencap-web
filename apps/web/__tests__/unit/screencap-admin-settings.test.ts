import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@cap/env", () => ({ serverEnv: () => ({}) }));
vi.mock("@cap/database", () => ({ db: () => ({}) }));
vi.mock("@cap/database/schema", () => ({
	screencapSettings: {},
	screencapAdminLog: {},
}));
vi.mock("@/lib/screencap-admin/audit", () => ({ logAdminAction: vi.fn() }));

import { validateSettingsPatch } from "@/lib/screencap-admin/settings";
import {
	mergeSettings,
	settingSources,
	settingsFromEnv,
} from "../../../../packages/database/screencap-settings";

describe("settings env fallback", () => {
	it("defaults to open with no limits", () => {
		expect(settingsFromEnv({})).toEqual({
			signupMode: "open",
			allowedDomains: [],
			blockedEmails: [],
			blockedCountries: [],
			maxRecordingMinutes: null,
			maxStorageHours: null,
		});
	});

	it("parses env vars", () => {
		const s = settingsFromEnv({
			CAP_ALLOWED_SIGNUP_DOMAINS: "A.com, b.org",
			CAP_BLOCKED_SIGNUP_DOMAINS: "bad.com,x@y.com",
			SCREENCAP_SIGNUP_BLOCKED_COUNTRIES: "ru, kp",
			SCREENCAP_MAX_RECORDING_SECONDS: "900",
			SCREENCAP_MAX_STORAGE_SECONDS: "7200",
		});
		expect(s.signupMode).toBe("allowlist");
		expect(s.allowedDomains).toEqual(["a.com", "b.org"]);
		expect(s.blockedEmails).toEqual(["bad.com", "x@y.com"]);
		expect(s.blockedCountries).toEqual(["RU", "KP"]);
		expect(s.maxRecordingMinutes).toBe(15);
		expect(s.maxStorageHours).toBe(2);
	});

	it("ignores junk numbers", () => {
		const s = settingsFromEnv({ SCREENCAP_MAX_RECORDING_SECONDS: "abc" });
		expect(s.maxRecordingMinutes).toBeNull();
	});
});

describe("DB rows override env", () => {
	const env = {
		CAP_ALLOWED_SIGNUP_DOMAINS: "a.com",
		SCREENCAP_MAX_RECORDING_SECONDS: "600",
	};
	it("row wins, including null meaning no limit", () => {
		const s = mergeSettings(env, {
			signupMode: "open",
			allowedDomains: ["Z.com"],
			maxRecordingMinutes: null,
			blockedCountries: ["th"],
		});
		expect(s.signupMode).toBe("open");
		expect(s.allowedDomains).toEqual(["z.com"]);
		expect(s.maxRecordingMinutes).toBeNull();
		expect(s.blockedCountries).toEqual(["TH"]);
	});
	it("missing or invalid rows fall back to env", () => {
		const s = mergeSettings(env, { maxRecordingMinutes: -3, signupMode: "x" });
		expect(s.maxRecordingMinutes).toBe(10);
		expect(s.signupMode).toBe("allowlist");
	});
	it("reports sources", () => {
		const src = settingSources({ signupMode: "open" });
		expect(src.signupMode).toBe("panel");
		expect(src.maxStorageHours).toBe("env");
	});
});

describe("validateSettingsPatch", () => {
	it("normalises", () => {
		expect(
			validateSettingsPatch({
				allowedDomains: [" Foo.COM ", "foo.com"],
				blockedCountries: ["th"],
				maxStorageHours: null,
			}),
		).toEqual({
			allowedDomains: ["foo.com"],
			blockedCountries: ["TH"],
			maxStorageHours: null,
		});
	});
	it("rejects bad values", () => {
		expect(() =>
			validateSettingsPatch({ blockedCountries: ["USA"] }),
		).toThrow();
		expect(() => validateSettingsPatch({ maxRecordingMinutes: 0 })).toThrow();
		expect(() =>
			validateSettingsPatch({ allowedDomains: ["nodot"] }),
		).toThrow();
		expect(() => validateSettingsPatch({ signupMode: "x" as never })).toThrow();
	});
});

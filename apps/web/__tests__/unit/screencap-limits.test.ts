import { beforeEach, describe, expect, it, vi } from "vitest";

const env: Record<string, string | undefined> = {};
const settings = vi.hoisted(() => ({
	maxRecordingMinutes: null as number | null,
	maxStorageHours: null as number | null,
}));
const overrides = vi.hoisted(() => ({
	value: { storageHoursOverride: null, recordingMinutesOverride: null } as {
		storageHoursOverride: number | null;
		recordingMinutesOverride: number | null;
	},
	fail: false,
	calls: [] as string[],
}));
const stored = vi.hoisted(() => ({ seconds: 0 }));
vi.mock("@cap/env", () => ({ serverEnv: () => env }));
vi.mock("@cap/database", () => ({
	db: () => ({
		select: () => ({
			from: () => ({ where: async () => [{ total: stored.seconds }] }),
		}),
	}),
}));
vi.mock("@cap/database/schema", () => ({ videos: {} }));
vi.mock("@cap/database/screencap-settings", () => ({
	getSettingsSync: () => settings,
}));
vi.mock("@/lib/screencap-admin/limit-overrides", () => ({
	getUserLimitOverrides: async (userId: string) => {
		overrides.calls.push(userId);
		if (overrides.fail) throw new Error("db down");
		return overrides.value;
	},
}));

import {
	checkCanCreateRecording,
	checkRecordingLength,
	maxRecordingSeconds,
	maxStorageSeconds,
	parseLimit,
	storageFullMessage,
} from "@/lib/screencap-limits";

describe("screencap limits", () => {
	beforeEach(() => {
		delete env.SCREENCAP_MAX_RECORDING_SECONDS;
		delete env.SCREENCAP_MAX_STORAGE_SECONDS;
		settings.maxRecordingMinutes = null;
		settings.maxStorageHours = null;
		overrides.value = {
			storageHoursOverride: null,
			recordingMinutesOverride: null,
		};
		overrides.fail = false;
		overrides.calls = [];
		stored.seconds = 0;
	});

	it("parses positive integers only", () => {
		expect(parseLimit("900")).toBe(900);
		expect(parseLimit(undefined)).toBeNull();
		expect(parseLimit("")).toBeNull();
		expect(parseLimit("0")).toBeNull();
		expect(parseLimit("-5")).toBeNull();
		expect(parseLimit("abc")).toBeNull();
		expect(parseLimit("1.5")).toBeNull();
	});

	it("has no length limit when unset", async () => {
		expect(maxRecordingSeconds()).toBeNull();
		expect(await checkRecordingLength(99999)).toEqual({ ok: true });
	});

	it("rejects over-length recordings with the beta message", async () => {
		env.SCREENCAP_MAX_RECORDING_SECONDS = "900";
		expect(await checkRecordingLength(900)).toEqual({ ok: true });
		expect(await checkRecordingLength(920, 30)).toEqual({ ok: true });
		expect(await checkRecordingLength(901)).toEqual({
			ok: false,
			code: "recording_too_long",
			message: "Recordings can be up to 15 minutes during the free beta.",
		});
	});

	it("formats the storage message", () => {
		expect(storageFullMessage(36000)).toBe(
			"You've used your 10 hours of free storage. Delete some recordings to make room.",
		);
	});

	it("panel settings (minutes/hours) override the env vars", () => {
		env.SCREENCAP_MAX_RECORDING_SECONDS = "900";
		env.SCREENCAP_MAX_STORAGE_SECONDS = "36000";
		settings.maxRecordingMinutes = 30;
		settings.maxStorageHours = 2;
		expect(maxRecordingSeconds()).toBe(1800);
		expect(maxStorageSeconds()).toBe(7200);
		settings.maxRecordingMinutes = null;
		settings.maxStorageHours = null;
		expect(maxRecordingSeconds()).toBe(900);
		expect(maxStorageSeconds()).toBe(36000);
	});

	it("uses the per-user recording override when a userId is given", async () => {
		settings.maxRecordingMinutes = 15;
		overrides.value = {
			storageHoursOverride: null,
			recordingMinutesOverride: 60,
		};
		expect(await checkRecordingLength(3000, 0, "user-1")).toEqual({ ok: true });
		expect(overrides.calls).toEqual(["user-1"]);
		// Without a userId the global limit applies and no lookup happens.
		const res = await checkRecordingLength(3000);
		expect(res.ok).toBe(false);
		expect(overrides.calls).toEqual(["user-1"]);
	});

	it("falls back to the global limit when the override lookup fails", async () => {
		settings.maxRecordingMinutes = 15;
		overrides.fail = true;
		const res = await checkRecordingLength(3000, 0, "user-1");
		expect(res.ok).toBe(false);
	});

	it("uses the per-user storage override", async () => {
		settings.maxStorageHours = 1;
		stored.seconds = 2 * 3600;
		expect((await checkCanCreateRecording("user-1")).ok).toBe(false);
		overrides.value = {
			storageHoursOverride: 5,
			recordingMinutesOverride: null,
		};
		expect(await checkCanCreateRecording("user-1")).toEqual({ ok: true });
		overrides.value = {
			storageHoursOverride: 1.5,
			recordingMinutesOverride: null,
		};
		const full = await checkCanCreateRecording("user-1");
		expect(full).toMatchObject({ ok: false, code: "storage_full" });
	});
});

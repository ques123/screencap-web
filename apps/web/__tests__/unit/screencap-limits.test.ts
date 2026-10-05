import { beforeEach, describe, expect, it, vi } from "vitest";

const env: Record<string, string | undefined> = {};
vi.mock("@cap/env", () => ({ serverEnv: () => env }));
vi.mock("@cap/database", () => ({ db: () => ({}) }));
vi.mock("@cap/database/schema", () => ({ videos: {} }));

import {
	checkRecordingLength,
	maxRecordingSeconds,
	parseLimit,
	storageFullMessage,
} from "@/lib/screencap-limits";

describe("screencap limits", () => {
	beforeEach(() => {
		delete env.SCREENCAP_MAX_RECORDING_SECONDS;
		delete env.SCREENCAP_MAX_STORAGE_SECONDS;
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

	it("has no length limit when unset", () => {
		expect(maxRecordingSeconds()).toBeNull();
		expect(checkRecordingLength(99999)).toEqual({ ok: true });
	});

	it("rejects over-length recordings with the beta message", () => {
		env.SCREENCAP_MAX_RECORDING_SECONDS = "900";
		expect(checkRecordingLength(900)).toEqual({ ok: true });
		expect(checkRecordingLength(920, 30)).toEqual({ ok: true });
		expect(checkRecordingLength(901)).toEqual({
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
});

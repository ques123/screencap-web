import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@cap/database", () => ({ db: () => ({}) }));

import { describeUserAgent } from "@cap/database/screencap-clients";
import {
	type RecordedWithFields,
	toRecordedWith,
} from "@/lib/screencap-admin/clients";

const base: RecordedWithFields = {
	rwClient: null,
	rwVersion: null,
	rwDetail: null,
	rwSourceType: null,
	rwScreenshot: false,
	rwLoom: 0,
};

describe("describeUserAgent", () => {
	it("names the browser and system", () => {
		expect(
			describeUserAgent(
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
			),
		).toBe("Chrome on macOS");
		expect(
			describeUserAgent(
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0",
			),
		).toBe("Edge on Windows");
		expect(
			describeUserAgent(
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
			),
		).toBe("Safari on macOS");
		expect(describeUserAgent(null)).toBeNull();
	});
});

describe("toRecordedWith", () => {
	it("uses the stored client when there is one", () => {
		expect(
			toRecordedWith({
				...base,
				rwClient: "desktop",
				rwVersion: "0.6.106",
				rwDetail: "Instant",
			}),
		).toEqual({
			label: "Mac app",
			version: "0.6.106",
			detail: "Instant",
			inferred: false,
		});
	});

	it("guesses older recordings from their source", () => {
		expect(
			toRecordedWith({ ...base, rwSourceType: "desktopSegments" }),
		).toMatchObject({ label: "Mac app", detail: "Instant", inferred: true });
		expect(toRecordedWith({ ...base, rwSourceType: "webMP4" })).toMatchObject({
			label: "Web recorder or upload",
			inferred: true,
		});
		expect(
			toRecordedWith({ ...base, rwSourceType: "webMP4", rwLoom: 1 }),
		).toMatchObject({ label: "Loom import" });
		expect(
			toRecordedWith({
				...base,
				rwSourceType: "desktopMP4",
				rwScreenshot: true,
			}),
		).toMatchObject({ label: "Mac app", detail: "Screenshot" });
	});
});

import { describe, expect, it } from "vitest";
import {
	isE2eeVideo,
	isValidE2eeFingerprint,
	isValidE2eeKey,
	parseE2eeCreateParams,
} from "@/lib/e2ee";
import { isPublicShareVideoCandidateEligible } from "@/lib/public-share-video";
import { buildShareVideoMetadata } from "@/lib/share-video-metadata";

const FP = "0123456789abcdef0123456789abcdef";

describe("isE2eeVideo", () => {
	it("is true only for 1 or true", () => {
		expect(isE2eeVideo({ e2ee: 1 })).toBe(true);
		expect(isE2eeVideo({ e2ee: true })).toBe(true);
		expect(isE2eeVideo({ e2ee: 0 })).toBe(false);
		expect(isE2eeVideo({ e2ee: null })).toBe(false);
		expect(isE2eeVideo({})).toBe(false);
		expect(isE2eeVideo(null)).toBe(false);
		expect(isE2eeVideo(undefined)).toBe(false);
	});
});

describe("parseE2eeCreateParams", () => {
	it("passes plaintext creates through", () => {
		expect(parseE2eeCreateParams({ recordingMode: "desktopMP4" })).toEqual({
			ok: true,
			e2ee: false,
			keyFingerprint: null,
		});
	});

	it("accepts e2ee with a fingerprint and segments", () => {
		expect(
			parseE2eeCreateParams({
				e2ee: "1",
				keyFingerprint: FP,
				recordingMode: "desktopSegments",
			}),
		).toEqual({ ok: true, e2ee: true, keyFingerprint: FP });
	});

	it("requires both params together", () => {
		expect(
			parseE2eeCreateParams({ e2ee: "1", recordingMode: "desktopSegments" }),
		).toMatchObject({ ok: false });
		expect(
			parseE2eeCreateParams({
				keyFingerprint: FP,
				recordingMode: "desktopSegments",
			}),
		).toMatchObject({ ok: false });
	});

	it("rejects a bad flag or fingerprint", () => {
		for (const keyFingerprint of [
			FP.toUpperCase(),
			FP.slice(1),
			`${FP}0`,
			"g".repeat(32),
		]) {
			expect(
				parseE2eeCreateParams({
					e2ee: "1",
					keyFingerprint,
					recordingMode: "desktopSegments",
				}),
			).toMatchObject({ ok: false });
		}
		expect(
			parseE2eeCreateParams({
				e2ee: "0",
				keyFingerprint: FP,
				recordingMode: "desktopSegments",
			}),
		).toMatchObject({ ok: false });
	});

	it("rejects e2ee outside desktopSegments", () => {
		for (const recordingMode of ["desktopMP4", "hls", undefined]) {
			expect(
				parseE2eeCreateParams({ e2ee: "1", keyFingerprint: FP, recordingMode }),
			).toMatchObject({ ok: false });
		}
	});
});

describe("key and fingerprint validators", () => {
	it("accepts a canonical key", () => {
		expect(isValidE2eeKey(`${"A".repeat(42)}A`)).toBe(true);
		expect(isValidE2eeKey(`${"_-".repeat(21)}w`)).toBe(true);
	});
	it("rejects wrong length, std-base64 chars and non-canonical tails", () => {
		expect(isValidE2eeKey("A".repeat(42))).toBe(false);
		expect(isValidE2eeKey("A".repeat(44))).toBe(false);
		expect(isValidE2eeKey(`${"A".repeat(41)}+A`)).toBe(false);
		expect(isValidE2eeKey(`${"A".repeat(41)}/A`)).toBe(false);
		expect(isValidE2eeKey(`${"A".repeat(42)}B`)).toBe(false);
		expect(isValidE2eeKey(undefined)).toBe(false);
		expect(isValidE2eeKey(5)).toBe(false);
	});
	it("checks fingerprints", () => {
		expect(isValidE2eeFingerprint(FP)).toBe(true);
		expect(isValidE2eeFingerprint("xyz")).toBe(false);
	});
});

describe("share surfaces for e2ee", () => {
	it("emits no stream or player tags", () => {
		const meta = buildShareVideoMetadata({
			videoId: "abc123xyz456789",
			name: "Demo",
			sourceType: "desktopSegments",
			webUrl: "https://screencap.co",
			e2ee: true,
			advertiseIframelyPlayer: true,
		});
		const json = JSON.stringify(meta);
		expect(json).not.toContain("/api/playlist");
		expect(json).not.toContain("/embed/");
		expect(json).not.toContain("animated");
		expect(json).not.toContain("api/video/preview");
		expect(meta.openGraph).not.toHaveProperty("videos");
		expect(json).toContain("/api/video/og");
	});

	it("keeps e2ee videos out of public share lookups", () => {
		const candidate = {
			id: "abc123xyz456789",
			name: "Demo",
			ownerId: "owner",
			ownerName: null,
			public: true,
			hasPassword: false,
			hasInheritedPassword: false,
			allowedEmailDomain: null,
			isScreenshot: false,
			hasActiveUpload: false,
			sourceType: "desktopSegments" as const,
			jobStatus: null,
			skipProcessing: null,
			width: null,
			height: null,
			duration: null,
		};
		expect(isPublicShareVideoCandidateEligible(candidate as never)).toBe(true);
		expect(
			isPublicShareVideoCandidateEligible({ ...candidate, e2ee: 1 } as never),
		).toBe(false);
	});
});

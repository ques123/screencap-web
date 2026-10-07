import { describe, expect, it } from "vitest";
import {
	buildE2eeReceipt,
	checkE2eeObjectSizes,
	E2eeFinalizeError,
	planE2eeFinalize,
	sha256Hex,
} from "@/lib/e2ee-finalize";

const source = {
	getVideoInitKey: () => "o/v/segments/video/init.mp4",
	getAudioInitKey: () => "o/v/segments/audio/init.mp4",
	getVideoSegmentKey: (i: number) =>
		`o/v/segments/video/segment_${String(i).padStart(3, "0")}.m4s`,
	getAudioSegmentKey: (i: number) =>
		`o/v/segments/audio/segment_${String(i).padStart(3, "0")}.m4s`,
};

function manifest(overrides: Record<string, unknown> = {}) {
	return JSON.stringify({
		version: 1,
		video_init_uploaded: true,
		audio_init_uploaded: true,
		is_complete: true,
		video_segments: [
			{ index: 1, duration: 2 },
			{ index: 2, duration: 2.5 },
		],
		audio_segments: [
			{ index: 1, duration: 2 },
			{ index: 2, duration: 2.5 },
		],
		...overrides,
	});
}

function plan(json: string, requiredAudio = false, hash = sha256Hex(json)) {
	return planE2eeFinalize({
		manifestJson: json,
		manifestSha256: hash,
		requiredAudio,
		source,
	});
}

function codeOf(fn: () => unknown) {
	try {
		fn();
	} catch (error) {
		return error instanceof E2eeFinalizeError ? error.code : "other";
	}
	return null;
}

function sizesFor(keys: string[], size = 100) {
	return new Map<string, number | null>(keys.map((key) => [key, size]));
}

describe("planE2eeFinalize", () => {
	it("lists every object and sums video durations", () => {
		const p = plan(manifest(), true);
		expect(p.hasAudio).toBe(true);
		expect(p.duration).toBeCloseTo(4.5);
		expect(p.expectedKeys).toEqual([
			"o/v/segments/video/init.mp4",
			"o/v/segments/audio/init.mp4",
			"o/v/segments/video/segment_001.m4s",
			"o/v/segments/video/segment_002.m4s",
			"o/v/segments/audio/segment_001.m4s",
			"o/v/segments/audio/segment_002.m4s",
		]);
	});

	it("handles a video-only recording", () => {
		const p = plan(
			manifest({ audio_init_uploaded: false, audio_segments: [] }),
		);
		expect(p.hasAudio).toBe(false);
		expect(p.audioInitKey).toBeNull();
		expect(p.expectedKeys).toHaveLength(3);
	});

	it("uses the default duration for bare segment numbers", () => {
		const p = plan(manifest({ video_segments: [1, 2], audio_segments: [] }));
		expect(p.duration).toBe(6);
	});

	it("refuses a hash mismatch", () => {
		expect(codeOf(() => plan(manifest(), false, "0".repeat(64)))).toBe(
			"manifest-hash-mismatch",
		);
	});

	it("refuses an incomplete manifest", () => {
		expect(codeOf(() => plan(manifest({ is_complete: false })))).toBe(
			"manifest-incomplete",
		);
		expect(codeOf(() => plan(manifest({ video_init_uploaded: false })))).toBe(
			"manifest-incomplete",
		);
		expect(codeOf(() => plan(manifest({ video_segments: [] })))).toBe(
			"manifest-incomplete",
		);
		expect(codeOf(() => plan(manifest({ audio_init_uploaded: false })))).toBe(
			"manifest-incomplete",
		);
	});

	it("refuses gaps, bad entries and broken JSON", () => {
		expect(
			codeOf(() =>
				plan(manifest({ video_segments: [{ index: 2, duration: 1 }] })),
			),
		).toBe("manifest-invalid");
		expect(codeOf(() => plan(manifest({ video_segments: ["x"] })))).toBe(
			"manifest-invalid",
		);
		expect(codeOf(() => plan("{nope"))).toBe("manifest-invalid");
	});

	it("enforces required audio", () => {
		const json = manifest({ audio_init_uploaded: false, audio_segments: [] });
		expect(codeOf(() => plan(json, true))).toBe("audio-required");
		expect(codeOf(() => plan(json, false))).toBeNull();
	});
});

describe("object checks and receipt", () => {
	const artifact = {
		kind: "segments" as const,
		manifestSha256: "a".repeat(64),
	};

	it("builds the contract receipt", () => {
		const p = plan(manifest(), true);
		const receipt = buildE2eeReceipt({
			videoId: "v",
			artifact,
			plan: p,
			sizes: sizesFor(p.expectedKeys, 100),
		});
		expect(receipt).toEqual({
			version: 1,
			videoId: "v",
			artifact,
			fileSize: 600,
			duration: 4.5,
			hasAudio: true,
			fullDecode: false,
			requiredAudioVerified: true,
			e2ee: true,
		});
	});

	it("reports no audio verification for video-only", () => {
		const p = plan(
			manifest({ audio_init_uploaded: false, audio_segments: [] }),
		);
		const receipt = buildE2eeReceipt({
			videoId: "v",
			artifact,
			plan: p,
			sizes: sizesFor(p.expectedKeys, 48),
		});
		expect(receipt.hasAudio).toBe(false);
		expect(receipt.requiredAudioVerified).toBe(false);
		expect(receipt.fileSize).toBe(144);
	});

	it("refuses a missing object", () => {
		const p = plan(manifest());
		const sizes = sizesFor(p.expectedKeys);
		sizes.delete("o/v/segments/audio/segment_002.m4s");
		expect(codeOf(() => checkE2eeObjectSizes(p, sizes))).toBe("object-missing");
		sizes.set("o/v/segments/audio/segment_002.m4s", null);
		expect(codeOf(() => checkE2eeObjectSizes(p, sizes))).toBe("object-missing");
	});

	it("refuses an object under 48 bytes", () => {
		const p = plan(manifest());
		const sizes = sizesFor(p.expectedKeys);
		sizes.set("o/v/segments/video/init.mp4", 47);
		expect(codeOf(() => checkE2eeObjectSizes(p, sizes))).toBe(
			"object-too-small",
		);
	});
});

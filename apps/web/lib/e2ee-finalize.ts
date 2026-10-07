import { createHash } from "node:crypto";
import { E2EE_MIN_OBJECT_BYTES } from "@/lib/e2ee";

export type E2eeFinalizeErrorCode =
	| "manifest-missing"
	| "manifest-invalid"
	| "manifest-hash-mismatch"
	| "manifest-incomplete"
	| "audio-required"
	| "object-missing"
	| "object-too-small";

export class E2eeFinalizeError extends Error {
	constructor(
		readonly code: E2eeFinalizeErrorCode,
		message: string,
	) {
		super(message);
		this.name = "E2eeFinalizeError";
	}
}

type ManifestEntry = number | { index: number; duration: number };

type ParsedManifest = {
	is_complete?: unknown;
	video_init_uploaded?: unknown;
	audio_init_uploaded?: unknown;
	video_segments?: unknown;
	audio_segments?: unknown;
};

export type E2eeFinalizePlan = {
	videoInitKey: string;
	audioInitKey: string | null;
	segmentKeys: string[];
	expectedKeys: string[];
	hasAudio: boolean;
	duration: number;
};

export type E2eeKeySource = {
	getVideoInitKey(): string;
	getAudioInitKey(): string;
	getVideoSegmentKey(index: number): string;
	getAudioSegmentKey(index: number): string;
};

const DEFAULT_SEGMENT_SECONDS = 3;

function readEntries(value: unknown, label: string) {
	if (!Array.isArray(value))
		throw new E2eeFinalizeError("manifest-invalid", `${label} is not a list`);
	const entries = (value as ManifestEntry[]).map((entry) => {
		if (typeof entry === "number")
			return { index: entry, duration: DEFAULT_SEGMENT_SECONDS };
		if (
			entry &&
			typeof entry === "object" &&
			typeof entry.index === "number" &&
			typeof entry.duration === "number"
		)
			return { index: entry.index, duration: entry.duration };
		throw new E2eeFinalizeError("manifest-invalid", `${label} entry invalid`);
	});
	for (const [position, entry] of entries.entries()) {
		if (
			!Number.isInteger(entry.index) ||
			entry.index !== position + 1 ||
			!Number.isFinite(entry.duration) ||
			entry.duration < 0
		)
			throw new E2eeFinalizeError(
				"manifest-invalid",
				`${label} has missing or unordered segments`,
			);
	}
	return entries;
}

export function sha256Hex(input: string | Uint8Array) {
	return createHash("sha256").update(input).digest("hex");
}

export function planE2eeFinalize(input: {
	manifestJson: string;
	manifestSha256: string;
	requiredAudio: boolean;
	source: E2eeKeySource;
}): E2eeFinalizePlan {
	if (sha256Hex(input.manifestJson) !== input.manifestSha256)
		throw new E2eeFinalizeError(
			"manifest-hash-mismatch",
			"Manifest does not match the upload",
		);
	let parsed: ParsedManifest;
	try {
		parsed = JSON.parse(input.manifestJson) as ParsedManifest;
	} catch {
		throw new E2eeFinalizeError("manifest-invalid", "Manifest is not JSON");
	}
	if (!parsed || typeof parsed !== "object")
		throw new E2eeFinalizeError(
			"manifest-invalid",
			"Manifest is not an object",
		);
	if (parsed.is_complete !== true || parsed.video_init_uploaded !== true)
		throw new E2eeFinalizeError(
			"manifest-incomplete",
			"Manifest is incomplete",
		);
	const video = readEntries(parsed.video_segments, "video_segments");
	const audio = readEntries(parsed.audio_segments ?? [], "audio_segments");
	if (video.length < 1)
		throw new E2eeFinalizeError("manifest-incomplete", "No video segments");
	const hasAudio = audio.length > 0;
	if (hasAudio && parsed.audio_init_uploaded !== true)
		throw new E2eeFinalizeError("manifest-incomplete", "Audio init missing");
	if (input.requiredAudio && !hasAudio)
		throw new E2eeFinalizeError("audio-required", "Required audio is missing");
	const videoInitKey = input.source.getVideoInitKey();
	const audioInitKey = hasAudio ? input.source.getAudioInitKey() : null;
	const segmentKeys = [
		...video.map((entry) => input.source.getVideoSegmentKey(entry.index)),
		...audio.map((entry) => input.source.getAudioSegmentKey(entry.index)),
	];
	return {
		videoInitKey,
		audioInitKey,
		segmentKeys,
		expectedKeys: [
			videoInitKey,
			...(audioInitKey ? [audioInitKey] : []),
			...segmentKeys,
		],
		hasAudio,
		duration: video.reduce((sum, entry) => sum + entry.duration, 0),
	};
}

export function checkE2eeObjectSizes(
	plan: E2eeFinalizePlan,
	sizes: ReadonlyMap<string, number | null | undefined>,
) {
	let total = 0;
	for (const key of plan.expectedKeys) {
		const size = sizes.get(key);
		if (size === undefined || size === null)
			throw new E2eeFinalizeError("object-missing", `Missing object ${key}`);
		if (size < E2EE_MIN_OBJECT_BYTES)
			throw new E2eeFinalizeError(
				"object-too-small",
				`Object ${key} is too small`,
			);
		total += size;
	}
	return total;
}

export type E2eeReceipt = {
	version: 1;
	videoId: string;
	artifact: { kind: "segments"; manifestSha256: string };
	fileSize: number;
	duration: number;
	hasAudio: boolean;
	fullDecode: false;
	requiredAudioVerified: boolean;
	e2ee: true;
};

export function buildE2eeReceipt(input: {
	videoId: string;
	artifact: { kind: "segments"; manifestSha256: string };
	plan: E2eeFinalizePlan;
	sizes: ReadonlyMap<string, number | null | undefined>;
}): E2eeReceipt {
	const fileSize = checkE2eeObjectSizes(input.plan, input.sizes);
	return {
		version: 1,
		videoId: input.videoId,
		artifact: input.artifact,
		fileSize,
		duration: input.plan.duration,
		hasAudio: input.plan.hasAudio,
		fullDecode: false,
		requiredAudioVerified: input.plan.hasAudio,
		e2ee: true,
	};
}

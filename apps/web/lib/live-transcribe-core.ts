import type { Video } from "@cap/web-domain";
import {
	EDIT_TRANSCRIPT_VERSION,
	type EditTranscript,
	type EditTranscriptWord,
	editTranscriptWordsToCaptionVtt,
} from "@/lib/edit-transcript";
import type { NormalizedSegmentEntry } from "@/lib/segments-audio";
import { planSegmentsAudioExtraction } from "@/lib/segments-audio";

/**
 * Pure logic for the provisional live transcription of instant-mode
 * recordings: which audio segments form the next chunk, how chunk words are
 * placed on the recording timeline, and the `transcription.live.json`
 * artifact that the share page reads while the canonical transcription
 * doesn't exist yet.
 */

export const LIVE_TRANSCRIBE = {
	/** First chunk fires fast so a transcript exists almost immediately. */
	INITIAL_CHUNK_SECONDS: 5,
	/** Steady-state window. Small on purpose: the untranscribed tail at stop
	 * averages half this, and that tail is all that stands between "stop" and
	 * a complete transcript on the share page. */
	MAX_CHUNK_SECONDS: 10,
	GROW_AFTER_CHUNKS: 2,
	/** Catch-up bound: one chunk never covers more audio than this. */
	MAX_CHUNK_TAKE_SECONDS: 60,
	/** Hard cost cap: stop live-transcribing after this much audio; the
	 * canonical post-stop transcription covers the full recording anyway. */
	MAX_TRANSCRIBED_SECONDS: 60 * 60,
	/** Hard backstop on chunk count (1h at 10s windows = 360). */
	MAX_CHUNKS: 420,
	POLL_INTERVAL_MS: 3_000,
	/** One waiting step holds its invocation at most this long. */
	MAX_POLL_MS_PER_STEP: 120_000,
	/** Consecutive empty waiting steps before giving up (~8 minutes). */
	MAX_IDLE_STEPS: 4,
	/** Attempts per chunk before it is skipped so one poison chunk can never
	 * wedge the loop or burn retries forever. */
	MAX_CHUNK_ATTEMPTS: 2,
} as const;

export type LiveTranscribeEngine = "openrouter" | "assemblyai";

/** OpenRouter providers bill a ~10 s minimum per request, so every chunk is
 * 10 s there (a 5 s first chunk would be billed as 10 anyway). */
export const OPENROUTER_LIVE_CHUNK_SECONDS = 10;

export function getLiveTargetSeconds(
	engine: LiveTranscribeEngine,
	chunkCount: number,
): number {
	if (engine === "openrouter") return OPENROUTER_LIVE_CHUNK_SECONDS;
	return chunkCount < LIVE_TRANSCRIBE.GROW_AFTER_CHUNKS
		? LIVE_TRANSCRIBE.INITIAL_CHUNK_SECONDS
		: LIVE_TRANSCRIBE.MAX_CHUNK_SECONDS;
}

export const LIVE_TITLE_DRAFT = {
	MIN_TRANSCRIBED_MS: 20_000,
	MIN_WORDS: 20,
	REDRAFT_INTERVAL_MS: 60_000,
	MAX_DRAFTS: 8,
} as const;

/** Whether the live loop should ask for a (re)draft of the title now. Pure
 * numbers only: the workflow tracks these across steps. */
export function shouldDraftLiveTitle(state: {
	transcribedMs: number;
	wordCount: number;
	lastDraftAtMs: number;
	draftCount: number;
}): boolean {
	if (state.draftCount >= LIVE_TITLE_DRAFT.MAX_DRAFTS) return false;
	if (state.transcribedMs < LIVE_TITLE_DRAFT.MIN_TRANSCRIBED_MS) return false;
	if (state.wordCount < LIVE_TITLE_DRAFT.MIN_WORDS) return false;
	if (state.draftCount === 0) return true;
	return (
		state.transcribedMs >=
		state.lastDraftAtMs + LIVE_TITLE_DRAFT.REDRAFT_INTERVAL_MS
	);
}

/** Words of the live transcript joined into plain text for title drafting. */
export function liveTranscriptText(words: readonly { text: string }[]): string {
	return words
		.map((word) => word.text)
		.join(" ")
		.replace(/\s+/g, " ")
		.trim();
}

/** OpenRouter takes an ISO 639 code; "auto"/unknown means omit it. Region
 * suffixes ("en_us") are dropped. */
export function toOpenRouterLanguage(
	language: string | null | undefined,
): string | undefined {
	if (!language) return undefined;
	const base = language.toLowerCase().split(/[-_]/)[0] ?? "";
	return /^[a-z]{2,3}$/.test(base) && base !== "auto" ? base : undefined;
}

/** Map OpenRouter words (seconds, `word`) to the AssemblyAI-shaped input
 * (ms, `text`) that offsetChunkWords expects. */
export function openRouterWordsToChunkInput(
	words: readonly {
		word: string;
		start: number;
		end: number;
		confidence?: number;
		speaker?: string | number;
	}[],
): LiveChunkWordInput[] {
	return words.map((word) => ({
		text: word.word,
		start: word.start * 1000,
		end: word.end * 1000,
		confidence: word.confidence,
		speaker: word.speaker === undefined ? undefined : String(word.speaker),
	}));
}

export type LiveChunkDecision =
	| { action: "wait" }
	| { action: "no-audio" }
	| { action: "done" }
	| {
			action: "chunk";
			entries: NormalizedSegmentEntry[];
			startMs: number;
			durationMs: number;
	  };

/**
 * Choose the next contiguous run of unprocessed audio segments. Segments
 * after an index gap are never taken (a missing upload would silently shift
 * every later word), so a mid-recording gap pauses live transcription and a
 * gap in a completed manifest ends it.
 */
export function planNextLiveChunk(options: {
	manifest: Video.SegmentManifestType;
	lastProcessedIndex: number;
	targetSeconds: number;
	maxTakeSeconds?: number;
}): LiveChunkDecision {
	const { manifest, lastProcessedIndex, targetSeconds } = options;
	const maxTakeSeconds =
		options.maxTakeSeconds ?? LIVE_TRANSCRIBE.MAX_CHUNK_TAKE_SECONDS;

	const plan = planSegmentsAudioExtraction(manifest, {
		requireComplete: false,
	});
	if (plan.status === "no-audio") {
		return manifest.is_complete ? { action: "no-audio" } : { action: "wait" };
	}
	if (plan.status !== "ok") {
		return { action: "wait" };
	}

	let startMs = 0;
	const pending: NormalizedSegmentEntry[] = [];
	let expectedIndex = plan.entries[0]?.index === 0 ? 0 : 1;

	for (const entry of plan.entries) {
		if (entry.index !== expectedIndex) break;
		expectedIndex++;

		if (entry.index <= lastProcessedIndex) {
			startMs += entry.duration * 1000;
		} else {
			pending.push(entry);
		}
	}

	if (pending.length === 0) {
		return manifest.is_complete ? { action: "done" } : { action: "wait" };
	}

	const taken: NormalizedSegmentEntry[] = [];
	let takenSeconds = 0;
	for (const entry of pending) {
		if (taken.length > 0 && takenSeconds + entry.duration > maxTakeSeconds) {
			break;
		}
		taken.push(entry);
		takenSeconds += entry.duration;
		if (takenSeconds >= maxTakeSeconds) break;
	}

	const tookEverything = taken.length === pending.length;
	if (!manifest.is_complete && tookEverything && takenSeconds < targetSeconds) {
		return { action: "wait" };
	}

	return {
		action: "chunk",
		entries: taken,
		startMs: Math.round(startMs),
		durationMs: Math.round(takenSeconds * 1000),
	};
}

export interface LiveChunkWordInput {
	text?: unknown;
	start?: unknown;
	end?: unknown;
	confidence?: unknown;
	speaker?: unknown;
}

/** Place a chunk's AssemblyAI words (chunk-relative ms) on the recording
 * timeline. Words outside the chunk bounds are clamped, invalid ones dropped. */
export function offsetChunkWords(
	words: readonly LiveChunkWordInput[] | null | undefined,
	chunkStartMs: number,
	chunkDurationMs: number,
): EditTranscriptWord[] {
	const result: EditTranscriptWord[] = [];

	for (const [index, word] of (words ?? []).entries()) {
		const text = typeof word.text === "string" ? word.text.trim() : "";
		const start = typeof word.start === "number" ? word.start : null;
		const end = typeof word.end === "number" ? word.end : null;
		if (!text || start === null || end === null || !Number.isFinite(start)) {
			continue;
		}

		const clamp = (value: number) =>
			Math.min(Math.max(Math.round(value), 0), chunkDurationMs);
		const startMs = chunkStartMs + clamp(start);
		const endMs = chunkStartMs + Math.max(clamp(end), clamp(start));

		result.push({
			id: `live-${chunkStartMs}-${index}`,
			text,
			startMs,
			endMs,
			confidence: typeof word.confidence === "number" ? word.confidence : null,
			speaker: typeof word.speaker === "string" ? word.speaker : null,
			channel: null,
		});
	}

	return result;
}

/**
 * AssemblyAI reports speech-free audio as a transcript error when language
 * detection is enabled. For chunked live transcription that's a valid empty
 * chunk (pauses in narration are normal), not a failure to retry.
 */
export function isNoSpokenAudioError(transcript: {
	status: string;
	error?: string | null;
}): boolean {
	return (
		transcript.status === "error" &&
		/no spoken audio/i.test(transcript.error ?? "")
	);
}

export const LIVE_TRANSCRIPT_VERSION = 1;

export type LiveTranscriptState = "active" | "complete" | "stopped";

export interface LiveTranscriptArtifact {
	version: typeof LIVE_TRANSCRIPT_VERSION;
	state: LiveTranscriptState;
	languageCode: string | null;
	lastAudioSegmentIndex: number;
	transcribedDurationMs: number;
	words: EditTranscriptWord[];
	vtt: string;
	updatedAt: string;
	/** A chunk was skipped after repeated failures, so some speech is missing.
	 * Disqualifies the artifact from being promoted to the canonical
	 * transcript; the full-pass fallback covers the recording instead. */
	hasGaps?: boolean;
}

export function getLiveTranscriptObjectKey(ownerId: string, videoId: string) {
	return `${ownerId}/${videoId}/transcription.live.json`;
}

/** Sentinel for "nothing processed yet": 0 is a legitimate segment index in
 * 0-based manifests, so the cursor starts below every real index. */
export const LIVE_TRANSCRIPT_NO_SEGMENTS = -1;

export function createEmptyLiveTranscript(
	nowIso: string,
): LiveTranscriptArtifact {
	return {
		version: LIVE_TRANSCRIPT_VERSION,
		state: "active",
		languageCode: null,
		lastAudioSegmentIndex: LIVE_TRANSCRIPT_NO_SEGMENTS,
		transcribedDurationMs: 0,
		words: [],
		vtt: editTranscriptWordsToCaptionVtt([]),
		updatedAt: nowIso,
		hasGaps: false,
	};
}

export function parseLiveTranscript(
	value: string,
): LiveTranscriptArtifact | null {
	try {
		const parsed = JSON.parse(value) as Partial<LiveTranscriptArtifact>;
		if (
			parsed?.version !== LIVE_TRANSCRIPT_VERSION ||
			!Array.isArray(parsed.words) ||
			typeof parsed.vtt !== "string" ||
			typeof parsed.lastAudioSegmentIndex !== "number" ||
			typeof parsed.transcribedDurationMs !== "number"
		) {
			return null;
		}
		return {
			version: LIVE_TRANSCRIPT_VERSION,
			state:
				parsed.state === "complete" || parsed.state === "stopped"
					? parsed.state
					: "active",
			languageCode:
				typeof parsed.languageCode === "string" ? parsed.languageCode : null,
			lastAudioSegmentIndex: parsed.lastAudioSegmentIndex,
			transcribedDurationMs: parsed.transcribedDurationMs,
			words: parsed.words,
			vtt: parsed.vtt,
			updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
			hasGaps: parsed.hasGaps === true,
		};
	} catch {
		return null;
	}
}

/**
 * Whether the live transcript fully and faithfully covers the recording, so
 * it can be promoted to the canonical transcript instead of paying for a
 * second full transcription pass. Anything short of complete gap-free
 * coverage means the full-pass fallback runs exactly as before.
 */
export function canPromoteLiveTranscript(
	artifact: LiveTranscriptArtifact,
	manifest: Video.SegmentManifestType,
): { ok: true } | { ok: false; reason: string } {
	if (!manifest.is_complete) {
		return { ok: false, reason: "manifest is not complete" };
	}
	if (artifact.hasGaps) {
		return { ok: false, reason: "live transcript has skipped chunks" };
	}

	const plan = planSegmentsAudioExtraction(manifest);
	if (plan.status === "no-audio") {
		return { ok: false, reason: "recording has no audio" };
	}
	if (plan.status !== "ok") {
		return { ok: false, reason: plan.reason };
	}

	const lastIndex = plan.entries[plan.entries.length - 1]?.index;
	if (lastIndex === undefined || artifact.lastAudioSegmentIndex !== lastIndex) {
		return {
			ok: false,
			reason: `covered up to segment ${artifact.lastAudioSegmentIndex} of ${lastIndex}`,
		};
	}

	// A manifest index gap means audio the recording had but we never saw.
	let expected = plan.entries[0]?.index ?? 1;
	for (const entry of plan.entries) {
		if (entry.index !== expected) {
			return { ok: false, reason: `segment gap at index ${expected}` };
		}
		expected++;
	}

	return { ok: true };
}

/**
 * Shape the accumulated live words as a canonical edit transcript (v3). The
 * caption VTT derives from the same words via editTranscriptWordsToCaptionVtt,
 * exactly as the full-pass path does.
 */
export function liveTranscriptToEditTranscript(
	artifact: LiveTranscriptArtifact,
	speechModelUsed: string,
): EditTranscript {
	return {
		version: EDIT_TRANSCRIPT_VERSION,
		speechModelUsed,
		durationMs: Math.max(0, Math.round(artifact.transcribedDurationMs)),
		languageCode: artifact.languageCode,
		words: artifact.words,
	};
}

/**
 * Merge one transcribed chunk into the artifact. Idempotent per chunk range:
 * a retried chunk first evicts any words at or after its start.
 */
export function applyChunkToLiveTranscript(
	artifact: LiveTranscriptArtifact,
	chunk: {
		startMs: number;
		durationMs: number;
		lastAudioSegmentIndex: number;
		words: EditTranscriptWord[];
		languageCode: string | null;
		nowIso: string;
	},
): LiveTranscriptArtifact {
	const words = [
		...artifact.words.filter((word) => word.startMs < chunk.startMs),
		...chunk.words,
	];

	return {
		...artifact,
		languageCode: artifact.languageCode ?? chunk.languageCode,
		lastAudioSegmentIndex: Math.max(
			artifact.lastAudioSegmentIndex,
			chunk.lastAudioSegmentIndex,
		),
		transcribedDurationMs: Math.max(
			artifact.transcribedDurationMs,
			chunk.startMs + chunk.durationMs,
		),
		words,
		vtt: editTranscriptWordsToCaptionVtt(words),
		updatedAt: chunk.nowIso,
	};
}

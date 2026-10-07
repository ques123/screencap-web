import { FatalError } from "workflow";
import type { AssemblyAIEditResult } from "@/lib/edit-transcript";
import {
	OpenRouterError,
	type OpenRouterTranscription,
	transcribeAudioChunk,
} from "./client";
import { splitMp3 } from "./mp3-chunks";

const CHUNK_CONCURRENCY = 2;
const MAX_RETRIES = 2;
const DEFAULT_RETRY_BASE_DELAY_MS = 1500;
const DEFAULT_MAX_CHUNK_SECONDS = 300;

type EditWord = {
	text: string;
	start: number;
	end: number;
	confidence: number | null;
	speaker: string | number | null;
};

function isRetryable(error: unknown): boolean {
	if (error instanceof OpenRouterError) {
		return error.status === 0 || error.status === 429 || error.status >= 500;
	}
	// Anything that isn't an API verdict (socket resets, aborts) is a network error.
	return true;
}

const sleep = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Spread [startMs, endMs] across the words of `text`, proportional to length. */
function spreadWords(
	text: string,
	startMs: number,
	endMs: number,
	speaker: string | number | null,
): EditWord[] {
	const tokens = text.split(/\s+/).filter(Boolean);
	if (tokens.length === 0) return [];
	const totalChars = tokens.reduce((sum, t) => sum + t.length, 0);
	const span = Math.max(0, endMs - startMs);
	let cursor = startMs;
	let consumed = 0;
	return tokens.map((token, index) => {
		consumed += token.length;
		const wordStart = cursor;
		const wordEnd =
			index === tokens.length - 1
				? endMs
				: startMs + (span * consumed) / totalChars;
		cursor = wordEnd;
		return {
			text: token,
			start: Math.round(wordStart),
			end: Math.round(wordEnd),
			confidence: null,
			speaker,
		};
	});
}

function chunkToWords(
	chunk: OpenRouterTranscription,
	chunkStartMs: number,
	chunkDurationMs: number,
): EditWord[] {
	if (chunk.words.length > 0) {
		return chunk.words.map((word) => ({
			text: word.word,
			start: Math.round(word.start * 1000) + chunkStartMs,
			end: Math.round(word.end * 1000) + chunkStartMs,
			confidence: word.confidence ?? null,
			speaker: word.speaker ?? null,
		}));
	}
	if (chunk.segments.length > 0) {
		return chunk.segments.flatMap((segment) =>
			spreadWords(
				segment.text,
				segment.start * 1000 + chunkStartMs,
				segment.end * 1000 + chunkStartMs,
				segment.speaker ?? null,
			),
		);
	}
	if (chunk.text) {
		return spreadWords(
			chunk.text,
			chunkStartMs,
			chunkStartMs + chunkDurationMs,
			null,
		);
	}
	return [];
}

export async function transcribeWithOpenRouterChunks(opts: {
	apiKey: string;
	model: string;
	zeroDataRetention: boolean;
	audio: Buffer;
	language?: string;
	fallbackDurationMs: number;
	/** Test/diagnostic overrides. */
	maxChunkSeconds?: number;
	retryBaseDelayMs?: number;
}): Promise<{
	result: AssemblyAIEditResult;
	costUsd: number | null;
	audioSeconds: number | null;
}> {
	const chunks = splitMp3(
		opts.audio,
		opts.maxChunkSeconds ?? DEFAULT_MAX_CHUNK_SECONDS,
		opts.fallbackDurationMs,
	);
	const retryBaseDelayMs = opts.retryBaseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS;

	const responses = new Array<OpenRouterTranscription>(chunks.length);

	const transcribeOne = async (index: number) => {
		const chunk = chunks[index];
		if (!chunk) return;
		for (let attempt = 0; ; attempt++) {
			try {
				responses[index] = await transcribeAudioChunk({
					apiKey: opts.apiKey,
					model: opts.model,
					audio: chunk.buffer,
					format: "mp3",
					language: opts.language,
					zeroDataRetention: opts.zeroDataRetention,
				});
				return;
			} catch (error) {
				if (attempt >= MAX_RETRIES || !isRetryable(error)) throw error;
				await sleep(retryBaseDelayMs * 2 ** attempt);
			}
		}
	};

	let next = 0;
	const worker = async () => {
		while (next < chunks.length) {
			const index = next++;
			await transcribeOne(index);
		}
	};
	await Promise.all(
		Array.from({ length: Math.min(CHUNK_CONCURRENCY, chunks.length) }, worker),
	);

	const words: EditWord[] = [];
	let language: string | null = null;
	let costUsd: number | null = 0;
	let audioSeconds: number | null = 0;
	let anyText = false;

	chunks.forEach((chunk, index) => {
		const response = responses[index] as OpenRouterTranscription;
		if (response.text || response.words.length > 0) anyText = true;
		language ??= response.language;
		words.push(...chunkToWords(response, chunk.startMs, chunk.durationMs));
		costUsd =
			costUsd === null || response.costUsd === null
				? null
				: costUsd + response.costUsd;
		audioSeconds =
			audioSeconds === null || response.seconds === null
				? null
				: audioSeconds + response.seconds;
	});

	if (!anyText && words.length === 0) {
		throw new FatalError("OpenRouter transcription found no spoken audio");
	}

	return {
		result: {
			words,
			language_code: language,
			speech_model_used: `openrouter:${opts.model}`,
		},
		costUsd,
		audioSeconds,
	};
}

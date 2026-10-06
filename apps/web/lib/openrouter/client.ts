export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export const OPENROUTER_APP_HEADERS = {
	"HTTP-Referer": "https://screencap.co",
	"X-Title": "Screencap",
} as const;

const TRANSCRIPTION_TIMEOUT_MS = 90_000;
const KEY_CHECK_TIMEOUT_MS = 15_000;

export class OpenRouterError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = "OpenRouterError";
		this.status = status;
	}
}

export type OpenRouterKeyInfo = {
	label: string;
	usageUsd: number;
	limitUsd: number | null;
	limitRemainingUsd: number | null;
	isFreeTier: boolean;
};

export type OpenRouterWord = {
	word: string;
	start: number;
	end: number;
	confidence?: number;
	speaker?: string | number;
};

export type OpenRouterSegment = {
	start: number;
	end: number;
	text: string;
	speaker?: string | number;
};

export type OpenRouterTranscription = {
	text: string;
	language: string | null;
	words: OpenRouterWord[];
	segments: OpenRouterSegment[];
	costUsd: number | null;
	seconds: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function num(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function speakerOf(value: unknown): string | number | undefined {
	if (typeof value === "string" && value.length > 0) return value;
	if (typeof value === "number" && Number.isFinite(value)) return value;
	return undefined;
}

/** Pull a human-readable provider message out of an error response body. */
async function readErrorMessage(response: Response): Promise<string> {
	let raw = "";
	try {
		raw = await response.text();
	} catch {
		return response.statusText || "Unknown error";
	}
	try {
		const parsed: unknown = JSON.parse(raw);
		if (isRecord(parsed)) {
			const error = parsed.error;
			if (isRecord(error) && typeof error.message === "string") {
				return error.message;
			}
			if (typeof error === "string") return error;
			if (typeof parsed.message === "string") return parsed.message;
		}
	} catch {}
	return raw.slice(0, 300) || response.statusText || "Unknown error";
}

export async function verifyOpenRouterKey(
	apiKey: string,
): Promise<OpenRouterKeyInfo> {
	let response: Response;
	try {
		response = await fetch(`${OPENROUTER_BASE_URL}/key`, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
				...OPENROUTER_APP_HEADERS,
			},
			signal: AbortSignal.timeout(KEY_CHECK_TIMEOUT_MS),
		});
	} catch (error) {
		throw new OpenRouterError(
			`Could not reach OpenRouter: ${error instanceof Error ? error.message : "network error"}`,
			0,
		);
	}

	if (!response.ok) {
		const message = await readErrorMessage(response);
		throw new OpenRouterError(
			response.status === 401
				? `OpenRouter rejected this key: ${message}`
				: `OpenRouter key check failed (${response.status}): ${message}`,
			response.status,
		);
	}

	const body: unknown = await response.json().catch(() => null);
	const data = isRecord(body) && isRecord(body.data) ? body.data : null;
	if (!data) {
		throw new OpenRouterError(
			"OpenRouter returned an unexpected response",
			502,
		);
	}

	return {
		label: typeof data.label === "string" ? data.label : "",
		usageUsd: num(data.usage) ?? 0,
		limitUsd: num(data.limit),
		limitRemainingUsd: num(data.limit_remaining),
		isFreeTier: data.is_free_tier === true,
	};
}

export async function transcribeAudioChunk(opts: {
	apiKey: string;
	model: string;
	audio: Buffer;
	format: "mp3" | "m4a";
	language?: string;
	zeroDataRetention?: boolean;
	signal?: AbortSignal;
}): Promise<OpenRouterTranscription> {
	const timeout = AbortSignal.timeout(TRANSCRIPTION_TIMEOUT_MS);
	const signal = opts.signal
		? AbortSignal.any([timeout, opts.signal])
		: timeout;

	const body: Record<string, unknown> = {
		model: opts.model,
		input_audio: { data: opts.audio.toString("base64"), format: opts.format },
		response_format: "verbose_json",
		timestamp_granularities: ["segment", "word"],
	};
	if (opts.language) body.language = opts.language;
	if (opts.zeroDataRetention) body.provider = { zdr: true };

	let response: Response;
	try {
		response = await fetch(`${OPENROUTER_BASE_URL}/audio/transcriptions`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${opts.apiKey}`,
				"Content-Type": "application/json",
				...OPENROUTER_APP_HEADERS,
			},
			body: JSON.stringify(body),
			signal,
		});
	} catch (error) {
		// status 0 = network/timeout; callers treat it as retryable
		throw new OpenRouterError(
			`OpenRouter transcription request failed: ${error instanceof Error ? error.message : "network error"}`,
			0,
		);
	}

	if (!response.ok) {
		const message = await readErrorMessage(response);
		throw new OpenRouterError(
			`OpenRouter transcription failed (${response.status}): ${message}`,
			response.status,
		);
	}

	const json: unknown = await response.json().catch(() => null);
	if (!isRecord(json)) {
		throw new OpenRouterError(
			"OpenRouter returned an unexpected transcription response",
			502,
		);
	}

	const words: OpenRouterWord[] = [];
	if (Array.isArray(json.words)) {
		for (const raw of json.words) {
			if (!isRecord(raw)) continue;
			const text = typeof raw.word === "string" ? raw.word.trim() : "";
			const start = num(raw.start);
			const end = num(raw.end);
			if (!text || start === null || end === null) continue;
			const word: OpenRouterWord = { word: text, start, end };
			const confidence = num(raw.confidence);
			if (confidence !== null) word.confidence = confidence;
			const speaker = speakerOf(raw.speaker);
			if (speaker !== undefined) word.speaker = speaker;
			words.push(word);
		}
	}

	const segments: OpenRouterSegment[] = [];
	if (Array.isArray(json.segments)) {
		for (const raw of json.segments) {
			if (!isRecord(raw)) continue;
			const text = typeof raw.text === "string" ? raw.text.trim() : "";
			const start = num(raw.start);
			const end = num(raw.end);
			if (!text || start === null || end === null) continue;
			const segment: OpenRouterSegment = { start, end, text };
			const speaker = speakerOf(raw.speaker);
			if (speaker !== undefined) segment.speaker = speaker;
			segments.push(segment);
		}
	}

	const usage = isRecord(json.usage) ? json.usage : {};

	return {
		text: typeof json.text === "string" ? json.text.trim() : "",
		language:
			typeof json.language === "string" && json.language ? json.language : null,
		words,
		segments,
		costUsd: num(usage.cost),
		seconds: num(usage.seconds) ?? num(json.duration),
	};
}

export async function exchangeOpenRouterAuthCode(
	code: string,
	codeVerifier: string,
): Promise<string> {
	let response: Response;
	try {
		response = await fetch(`${OPENROUTER_BASE_URL}/auth/keys`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...OPENROUTER_APP_HEADERS,
			},
			body: JSON.stringify({
				code,
				code_verifier: codeVerifier,
				code_challenge_method: "S256",
			}),
			signal: AbortSignal.timeout(KEY_CHECK_TIMEOUT_MS),
		});
	} catch (error) {
		throw new OpenRouterError(
			`Could not reach OpenRouter: ${error instanceof Error ? error.message : "network error"}`,
			0,
		);
	}

	if (!response.ok) {
		const message = await readErrorMessage(response);
		throw new OpenRouterError(
			`OpenRouter code exchange failed (${response.status}): ${message}`,
			response.status,
		);
	}

	const body: unknown = await response.json().catch(() => null);
	const key = isRecord(body) && typeof body.key === "string" ? body.key : "";
	if (!key) {
		throw new OpenRouterError("OpenRouter did not return a key", 502);
	}
	return key;
}

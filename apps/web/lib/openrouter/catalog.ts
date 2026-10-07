import "server-only";

import { formatPerHour, summaryPerHourUsd } from "./format-cost";

export const DEFAULT_TRANSCRIPTION_MODEL = "openai/whisper-large-v3-turbo";
export const DEFAULT_SUMMARY_MODEL = "google/gemini-3.5-flash-lite";

const OPENROUTER_API = "https://openrouter.ai/api/v1";
const REQUEST_HEADERS = {
	"HTTP-Referer": "https://screencap.co",
	"X-Title": "Screencap",
} as const;
const FETCH_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/** Only models measured to return word timestamps. calibratedPerHourUsd measured 2026-10-06. */
export const SUPPORTED_TRANSCRIPTION_MODELS: readonly {
	id: string;
	label: string;
	note: string;
	calibratedPerHourUsd: number;
}[] = [
	{
		id: "openai/whisper-large-v3-turbo",
		label: "Whisper Large v3 Turbo",
		note: "Fastest, very cheap",
		calibratedPerHourUsd: 0.04,
	},
	{
		id: "openai/whisper-large-v3",
		label: "Whisper Large v3",
		note: "Accurate, but slower",
		calibratedPerHourUsd: 0.027,
	},
	{
		id: "openai/whisper-1",
		label: "Whisper v1",
		note: "Original OpenAI Whisper",
		calibratedPerHourUsd: 0.36,
	},
	{
		id: "google/gemini-3.5-transcribe",
		label: "Gemini 3.5 Transcribe",
		note: "Google speech model",
		calibratedPerHourUsd: 0.18,
	},
	{
		id: "deepgram/nova-3",
		label: "Deepgram Nova 3",
		note: "Strong on accents and noisy audio",
		calibratedPerHourUsd: 0.26,
	},
	{
		id: "mistralai/voxtral-mini-transcribe",
		label: "Voxtral Mini Transcribe",
		note: "Mistral speech model",
		calibratedPerHourUsd: 0.18,
	},
	{
		id: "x-ai/grok-stt-1.0",
		label: "Grok STT 1.0",
		note: "Fast",
		calibratedPerHourUsd: 0.1,
	},
	{
		id: "qwen/qwen3-asr-0.6b",
		label: "Qwen3 ASR 0.6B",
		note: "Smallest and cheapest",
		calibratedPerHourUsd: 0.012,
	},
	{
		id: "qwen/qwen3-asr-1.7b",
		label: "Qwen3 ASR 1.7B",
		note: "Cheap, a step up from 0.6B",
		calibratedPerHourUsd: 0.027,
	},
	{
		id: "nvidia/nemotron-3.5-asr-streaming-multilingual-0.6b",
		label: "Nemotron 3.5 ASR Multilingual",
		note: "Multilingual, very cheap",
		calibratedPerHourUsd: 0.012,
	},
	{
		id: "fish-audio/transcribe-1",
		label: "Fish Audio Transcribe 1",
		note: "Premium priced",
		calibratedPerHourUsd: 0.36,
	},
];

export function isSupportedTranscriptionModel(id: string): boolean {
	return SUPPORTED_TRANSCRIPTION_MODELS.some((m) => m.id === id);
}

export type ModelOption = {
	id: string;
	name: string;
	perHourUsd: number | null;
	perHourLabel: string;
	note?: string;
	recommended?: boolean;
	contextLength?: number;
};

const CURATED_SUMMARY_MODELS = [
	DEFAULT_SUMMARY_MODEL,
	"openai/gpt-oss-120b",
	"google/gemini-2.5-flash-lite",
	"mistralai/mistral-small-3.2-24b-instruct",
	"openai/gpt-5-nano",
	"deepseek/deepseek-chat-v3.1",
	"anthropic/claude-haiku-4.5",
];

type CacheEntry = { at: number; value: ModelOption[] };

type Cached = {
	entry: CacheEntry | null;
	inflight: Promise<ModelOption[]> | null;
};

const transcriptionCache: Cached = { entry: null, inflight: null };
const summaryCache: Cached = { entry: null, inflight: null };

export function __resetCatalogCacheForTests() {
	transcriptionCache.entry = null;
	transcriptionCache.inflight = null;
	summaryCache.entry = null;
	summaryCache.inflight = null;
}

async function cached(
	cache: Cached,
	load: () => Promise<{ value: ModelOption[]; cacheable: boolean }>,
): Promise<ModelOption[]> {
	if (cache.entry && Date.now() - cache.entry.at < CACHE_TTL_MS) {
		return cache.entry.value;
	}
	if (cache.inflight) return cache.inflight;
	const promise = load()
		.then(({ value, cacheable }) => {
			if (cacheable) cache.entry = { at: Date.now(), value };
			return value;
		})
		.finally(() => {
			cache.inflight = null;
		});
	cache.inflight = promise;
	return promise;
}

async function fetchJson(url: string): Promise<unknown> {
	const res = await fetch(url, {
		headers: REQUEST_HEADERS,
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
	});
	if (!res.ok) throw new Error(`OpenRouter responded ${res.status}`);
	return res.json();
}

const toNumber = (v: unknown): number | null => {
	if (v === null || v === undefined || v === "") return null;
	const n = typeof v === "number" ? v : Number(v);
	return Number.isFinite(n) ? n : null;
};

type RawEndpoint = { pricing?: { prompt?: unknown; completion?: unknown } };

/** Duration-priced models: max prompt price (USD/second) across endpoints, times 3600. Else null. */
function durationPerHourUsd(endpoints: RawEndpoint[]): number | null {
	let max: number | null = null;
	for (const endpoint of endpoints) {
		const prompt = toNumber(endpoint.pricing?.prompt);
		const completion = toNumber(endpoint.pricing?.completion);
		if (prompt === null || prompt <= 0) continue;
		if (completion !== null && completion > 0) return null; // token-priced
		if (max === null || prompt > max) max = prompt;
	}
	return max === null ? null : max * 3600;
}

async function loadTranscriptionOptions(): Promise<{
	value: ModelOption[];
	cacheable: boolean;
}> {
	let failures = 0;
	const options = await Promise.all(
		SUPPORTED_TRANSCRIPTION_MODELS.map(async (model) => {
			let perHourUsd = model.calibratedPerHourUsd;
			try {
				const json = (await fetchJson(
					`${OPENROUTER_API}/models/${model.id}/endpoints`,
				)) as { data?: { endpoints?: RawEndpoint[] } };
				const live = durationPerHourUsd(json?.data?.endpoints ?? []);
				if (live !== null) perHourUsd = live;
			} catch {
				failures++;
			}
			const option: ModelOption = {
				id: model.id,
				name: model.label,
				perHourUsd,
				perHourLabel: formatPerHour(perHourUsd),
				note: model.note,
				...(model.id === DEFAULT_TRANSCRIPTION_MODEL
					? { recommended: true }
					: {}),
			};
			return option;
		}),
	);
	options.sort(
		(a, b) =>
			(a.perHourUsd ?? 0) - (b.perHourUsd ?? 0) || a.id.localeCompare(b.id),
	);
	return {
		value: options,
		cacheable: failures < SUPPORTED_TRANSCRIPTION_MODELS.length,
	};
}

export function getTranscriptionModelOptions(): Promise<ModelOption[]> {
	return cached(transcriptionCache, loadTranscriptionOptions);
}

type RawModel = {
	id?: string;
	name?: string;
	context_length?: number | null;
	architecture?: { input_modalities?: string[]; output_modalities?: string[] };
	pricing?: { prompt?: unknown; completion?: unknown };
};

function toSummaryOption(model: RawModel): ModelOption | null {
	const id = model.id;
	if (!id || id.endsWith(":batch") || id.endsWith(":free")) return null;
	if (id.startsWith("~")) return null;
	if (id.startsWith("openrouter/")) return null;
	const input = model.architecture?.input_modalities ?? [];
	const output = model.architecture?.output_modalities ?? [];
	if (!input.includes("text") || !output.includes("text")) return null;
	if (output.includes("image") || output.includes("audio")) return null;
	if ((model.context_length ?? 0) < 32_000) return null;
	const prompt = toNumber(model.pricing?.prompt);
	const completion = toNumber(model.pricing?.completion);
	if (prompt === null || completion === null || prompt < 0 || completion < 0) {
		return null;
	}
	if (prompt === 0 && completion === 0) return null;
	const perHourUsd = summaryPerHourUsd(prompt, completion);
	return {
		id,
		name: model.name || id,
		perHourUsd,
		perHourLabel: formatPerHour(perHourUsd),
		contextLength: model.context_length ?? undefined,
	};
}

function curatedFallback(): ModelOption[] {
	return CURATED_SUMMARY_MODELS.map((id) => ({
		id,
		name: id,
		perHourUsd: null,
		perHourLabel: formatPerHour(null),
		recommended: true,
	}));
}

async function loadSummaryOptions(): Promise<{
	value: ModelOption[];
	cacheable: boolean;
}> {
	try {
		const json = (await fetchJson(`${OPENROUTER_API}/models`)) as {
			data?: RawModel[];
		};
		const all = (json?.data ?? [])
			.map(toSummaryOption)
			.filter((o): o is ModelOption => o !== null);
		if (all.length === 0) return { value: curatedFallback(), cacheable: false };
		const byId = new Map(all.map((o) => [o.id, o]));
		const curated: ModelOption[] = [];
		for (const id of CURATED_SUMMARY_MODELS) {
			const option = byId.get(id);
			if (option) {
				curated.push({ ...option, recommended: true });
				byId.delete(id);
			}
		}
		const rest = [...byId.values()].sort(
			(a, b) =>
				(a.perHourUsd ?? 0) - (b.perHourUsd ?? 0) ||
				a.name.localeCompare(b.name),
		);
		return { value: [...curated, ...rest], cacheable: true };
	} catch {
		return { value: curatedFallback(), cacheable: false };
	}
}

export function getSummaryModelOptions(): Promise<ModelOption[]> {
	return cached(summaryCache, loadSummaryOptions);
}

export async function isAvailableSummaryModel(id: string): Promise<boolean> {
	const options = await getSummaryModelOptions();
	return options.some((o) => o.id === id);
}

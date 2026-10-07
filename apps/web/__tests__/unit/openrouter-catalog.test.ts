import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
	__resetCatalogCacheForTests,
	DEFAULT_SUMMARY_MODEL,
	DEFAULT_TRANSCRIPTION_MODEL,
	getSummaryModelOptions,
	getTranscriptionModelOptions,
	isAvailableSummaryModel,
	isSupportedTranscriptionModel,
	SUPPORTED_TRANSCRIPTION_MODELS,
} from "@/lib/openrouter/catalog";

const fetchMock = vi.fn();

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status });

const endpoints = (...prices: [string, string][]) => ({
	data: {
		endpoints: prices.map(([prompt, completion]) => ({
			pricing: { prompt, completion },
		})),
	},
});

const model = (
	id: string,
	prompt: string,
	completion: string,
	extra: Record<string, unknown> = {},
) => ({
	id,
	name: id.split("/")[1],
	context_length: 128000,
	architecture: { input_modalities: ["text"], output_modalities: ["text"] },
	pricing: { prompt, completion },
	...extra,
});

beforeEach(() => {
	__resetCatalogCacheForTests();
	fetchMock.mockReset();
	vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("transcription options", () => {
	it("lists the supported models with the default recommended", () => {
		expect(SUPPORTED_TRANSCRIPTION_MODELS).toHaveLength(11);
		expect(isSupportedTranscriptionModel(DEFAULT_TRANSCRIPTION_MODEL)).toBe(
			true,
		);
		expect(isSupportedTranscriptionModel("openai/gpt-4o-transcribe")).toBe(
			false,
		);
	});

	it("uses max endpoint price for duration-priced models, calibrated for token-priced and failures", async () => {
		fetchMock.mockImplementation(async (url: string) => {
			if (url.includes("whisper-large-v3-turbo/")) {
				return json(endpoints(["0.00000333", "0"], ["0.0000111", "0"]));
			}
			if (url.includes("gemini-3.5-transcribe/")) {
				return json(endpoints(["0.000001", "0.000002"]));
			}
			if (url.includes("deepgram/nova-3/")) return json({}, 500);
			if (url.includes("whisper-1/")) return json({ data: { endpoints: [] } });
			if (url.includes("qwen3-asr-0.6b/")) throw new Error("network");
			return json(endpoints(["0.00001", "0"]));
		});
		const options = await getTranscriptionModelOptions();
		const byId = Object.fromEntries(options.map((o) => [o.id, o]));

		expect(options).toHaveLength(11);
		expect(byId["openai/whisper-large-v3-turbo"]?.perHourUsd).toBeCloseTo(
			0.03996,
			6,
		);
		expect(byId["openai/whisper-large-v3-turbo"]?.perHourLabel).toBe(
			"4¢ an hour",
		);
		expect(byId["openai/whisper-large-v3-turbo"]?.recommended).toBe(true);
		expect(byId["google/gemini-3.5-transcribe"]?.perHourUsd).toBe(0.18);
		expect(byId["deepgram/nova-3"]?.perHourUsd).toBe(0.26);
		expect(byId["openai/whisper-1"]?.perHourUsd).toBe(0.36);
		expect(byId["qwen/qwen3-asr-0.6b"]?.perHourUsd).toBe(0.012);
		expect(byId["qwen/qwen3-asr-0.6b"]?.perHourLabel).toBe("2¢ an hour");
		expect(byId["x-ai/grok-stt-1.0"]?.perHourUsd).toBeCloseTo(0.036, 9);

		const prices = options.map((o) => o.perHourUsd ?? 0);
		expect(prices).toEqual([...prices].sort((a, b) => a - b));
		expect(options.filter((o) => o.recommended)).toHaveLength(1);
	});

	it("falls back to calibrated prices when every fetch fails", async () => {
		fetchMock.mockRejectedValue(new Error("offline"));
		const options = await getTranscriptionModelOptions();
		expect(options).toHaveLength(11);
		expect(options[0]?.perHourUsd).toBe(0.012);
		// failures are not cached
		await getTranscriptionModelOptions();
		expect(fetchMock).toHaveBeenCalledTimes(22);
	});

	it("shares one fetch round between concurrent callers and caches", async () => {
		fetchMock.mockImplementation(async () => json(endpoints(["0.00001", "0"])));
		const [a, b] = await Promise.all([
			getTranscriptionModelOptions(),
			getTranscriptionModelOptions(),
		]);
		expect(a).toBe(b);
		await getTranscriptionModelOptions();
		expect(fetchMock).toHaveBeenCalledTimes(11);
		const init = fetchMock.mock.calls[0]?.[1];
		expect(init?.headers).toMatchObject({
			"HTTP-Referer": "https://screencap.co",
			"X-Title": "Screencap",
		});
	});
});

describe("summary options", () => {
	const fixture = {
		data: [
			model("zeta/cheap-a", "0.0000001", "0.0000002"),
			model("alpha/cheap-b", "0.0000001", "0.0000002"),
			model("acme/expensive", "0.00001", "0.00005"),
			model("acme/free", "0", "0"),
			model("acme/other:free", "0", "0"),
			model("acme/paid:free", "0.0000001", "0.0000001"),
			model("openai/gpt-oss-120b", "0.0000001", "0.0000005"),
			model(DEFAULT_SUMMARY_MODEL, "0.0000001", "0.0000004"),
			model("acme/small-context", "0.0000001", "0.0000001", {
				context_length: 8000,
			}),
			model("acme/thing:batch", "0.0000001", "0.0000001"),
			model("~acme/latest", "0.0000001", "0.0000001"),
			model("openrouter/auto", "-1", "-1"),
			model("acme/negative", "-1", "-1"),
			model("acme/image-out", "0.0000001", "0.0000001", {
				architecture: {
					input_modalities: ["text"],
					output_modalities: ["text", "image"],
				},
			}),
			model("acme/audio-in", "0.0000001", "0.0000001", {
				architecture: {
					input_modalities: ["audio"],
					output_modalities: ["text"],
				},
			}),
		],
	};

	it("filters, puts curated first, then sorts by price and name", async () => {
		fetchMock.mockResolvedValue(json(fixture));
		const options = await getSummaryModelOptions();
		expect(options.map((o) => o.id)).toEqual([
			DEFAULT_SUMMARY_MODEL,
			"openai/gpt-oss-120b",
			"zeta/cheap-a",
			"alpha/cheap-b",
			"acme/expensive",
		]);
		expect(options[0]?.recommended).toBe(true);
		expect(options[2]?.recommended).toBeUndefined();
		expect(options.some((o) => o.id.endsWith(":free"))).toBe(false);
		expect(options.some((o) => o.id === "acme/free")).toBe(false);
		// 25k * 1e-7 + 5k * 4e-7 = 0.0045
		expect(options[0]?.perHourUsd).toBeCloseTo(0.0045, 9);
		expect(options[0]?.perHourLabel).toBe("Under 1¢ an hour");
		expect(options[0]?.contextLength).toBe(128000);
	});

	it("caches and answers availability", async () => {
		fetchMock.mockResolvedValue(json(fixture));
		expect(await isAvailableSummaryModel("acme/expensive")).toBe(true);
		expect(await isAvailableSummaryModel("acme/image-out")).toBe(false);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("returns the curated list with unknown prices on failure and accepts only curated ids", async () => {
		fetchMock.mockResolvedValue(json({}, 503));
		const options = await getSummaryModelOptions();
		expect(options.map((o) => o.id)[0]).toBe(DEFAULT_SUMMARY_MODEL);
		expect(options.length).toBe(7);
		expect(options.every((o) => o.perHourUsd === null && o.name === o.id)).toBe(
			true,
		);
		expect(options[0]?.perHourLabel).toBe("Price unknown");
		expect(await isAvailableSummaryModel("openai/gpt-5-nano")).toBe(true);
		expect(await isAvailableSummaryModel("acme/expensive")).toBe(false);
	});
});

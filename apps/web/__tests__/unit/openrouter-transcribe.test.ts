import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { transcribeWithOpenRouterChunks } from "@/lib/openrouter/transcribe";

const FRAME_MS = (1152 * 1000) / 44100;

function mp3(frameCount: number): Buffer {
	return Buffer.concat(
		Array.from({ length: frameCount }, (_, i) => {
			const pad = i % 3 === 0 ? 1 : 0;
			const buf = Buffer.alloc(417 + pad);
			buf[0] = 0xff;
			buf[1] = 0xfb;
			buf[2] = 0x90 | (pad << 1);
			return buf;
		}),
	);
}

const jsonResponse = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});

const base = {
	apiKey: "sk-or-test",
	model: "openai/whisper-large-v3-turbo",
	zeroDataRetention: false,
	fallbackDurationMs: 0,
	retryBaseDelayMs: 1,
};

describe("transcribeWithOpenRouterChunks", () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		fetchMock.mockReset();
		vi.stubGlobal("fetch", fetchMock);
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("offsets chunk timestamps, merges, and sums cost and seconds", async () => {
		// ~26 s of audio, 10 s chunks => 3 chunks
		const audio = mp3(1000);
		const responses = [
			{
				text: "hello world",
				language: "en",
				words: [
					{ word: " hello", start: 0.5, end: 0.9 },
					{ word: " world", start: 1, end: 1.4, confidence: 0.9 },
				],
				usage: { cost: 0.001, seconds: 10 },
			},
			{
				text: "second",
				words: [{ word: "second", start: 0.1, end: 0.5 }],
				usage: { cost: 0.002, seconds: 10 },
			},
			{
				text: "third",
				words: [{ word: "third", start: 0, end: 0.2 }],
				usage: { cost: 0.003, seconds: 6 },
			},
		];
		// Key responses by decoded chunk order via call-count (concurrency 2 keeps start order).
		let call = 0;
		fetchMock.mockImplementation(async () => jsonResponse(responses[call++]));

		const { result, costUsd, audioSeconds } =
			await transcribeWithOpenRouterChunks({
				...base,
				audio,
				maxChunkSeconds: 10,
			});

		const second = Math.round(382 * FRAME_MS);
		expect(result.words?.map((w) => w.text)).toEqual([
			"hello",
			"world",
			"second",
			"third",
		]);
		expect(result.words?.[0]).toMatchObject({ start: 500, end: 900 });
		expect(result.words?.[1]).toMatchObject({
			start: 1000,
			end: 1400,
			confidence: 0.9,
		});
		expect(result.words?.[2]?.start).toBe(second + 100);
		expect(result.words?.[3]?.start).toBe(Math.round(764 * FRAME_MS));
		expect(result.language_code).toBe("en");
		expect(result.speech_model_used).toBe(`openrouter:${base.model}`);
		expect(costUsd).toBeCloseTo(0.006, 6);
		expect(audioSeconds).toBe(26);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it("synthesises words from segments proportional to character length", async () => {
		fetchMock.mockImplementation(async () =>
			jsonResponse({
				text: "ab cdef",
				segments: [{ start: 1, end: 4, text: "ab cdef" }],
				usage: { cost: 0, seconds: 5 },
			}),
		);
		const { result } = await transcribeWithOpenRouterChunks({
			...base,
			audio: mp3(100),
		});
		expect(result.words).toMatchObject([
			{ text: "ab", start: 1000, end: 2000 },
			{ text: "cdef", start: 2000, end: 4000 },
		]);
	});

	it("spreads text-only responses across the whole chunk", async () => {
		fetchMock.mockImplementation(async () =>
			jsonResponse({ text: "aa bb", usage: { cost: 0.1, seconds: 1 } }),
		);
		const audio = mp3(100);
		const { result } = await transcribeWithOpenRouterChunks({ ...base, audio });
		const total = Math.round(100 * FRAME_MS);
		expect(result.words?.[0]).toMatchObject({ text: "aa", start: 0 });
		expect(result.words?.[1]).toMatchObject({ text: "bb", end: total });
	});

	it("returns null cost when any chunk lacks cost", async () => {
		let call = 0;
		fetchMock.mockImplementation(async () =>
			jsonResponse(
				call++ === 0
					? {
							text: "a",
							words: [{ word: "a", start: 0, end: 1 }],
							usage: { cost: 0.1 },
						}
					: { text: "b", words: [{ word: "b", start: 0, end: 1 }] },
			),
		);
		const { costUsd } = await transcribeWithOpenRouterChunks({
			...base,
			audio: mp3(1000),
			maxChunkSeconds: 20,
		});
		expect(costUsd).toBeNull();
	});

	it("retries 429 and 5xx responses up to twice", async () => {
		fetchMock
			.mockResolvedValueOnce(
				jsonResponse({ error: { message: "slow down" } }, 429),
			)
			.mockResolvedValueOnce(jsonResponse({ error: { message: "oops" } }, 502))
			.mockResolvedValueOnce(
				jsonResponse({ text: "ok", words: [{ word: "ok", start: 0, end: 1 }] }),
			);
		const { result } = await transcribeWithOpenRouterChunks({
			...base,
			audio: mp3(50),
		});
		expect(result.words).toHaveLength(1);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it("does not retry 4xx and surfaces the provider message without the key", async () => {
		fetchMock.mockImplementation(async () =>
			jsonResponse({ error: { message: "model not found" } }, 404),
		);
		const promise = transcribeWithOpenRouterChunks({ ...base, audio: mp3(50) });
		await expect(promise).rejects.toThrow(/model not found/);
		await expect(promise).rejects.not.toThrow(/sk-or-test/);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("gives up after two retries", async () => {
		fetchMock.mockImplementation(async () =>
			jsonResponse({ error: { message: "down" } }, 503),
		);
		await expect(
			transcribeWithOpenRouterChunks({ ...base, audio: mp3(50) }),
		).rejects.toThrow(/down/);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it("sends the documented request body and headers", async () => {
		fetchMock.mockImplementation(async () =>
			jsonResponse({ text: "x", words: [{ word: "x", start: 0, end: 1 }] }),
		);
		await transcribeWithOpenRouterChunks({
			...base,
			audio: mp3(50),
			language: "de",
			zeroDataRetention: true,
		});
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe("https://openrouter.ai/api/v1/audio/transcriptions");
		const body = JSON.parse(init.body as string);
		expect(body).toMatchObject({
			model: base.model,
			response_format: "verbose_json",
			timestamp_granularities: ["segment", "word"],
			language: "de",
			provider: { zdr: true },
			input_audio: { format: "mp3" },
		});
		expect(typeof body.input_audio.data).toBe("string");
		expect((init.headers as Record<string, string>)["X-Title"]).toBe(
			"Screencap",
		);
	});

	it("throws a 'no spoken audio' error when every chunk is empty", async () => {
		fetchMock.mockImplementation(async () =>
			jsonResponse({ text: "  ", usage: { cost: 0 } }),
		);
		await expect(
			transcribeWithOpenRouterChunks({ ...base, audio: mp3(50) }),
		).rejects.toThrow(/no spoken audio/i);
	});
});

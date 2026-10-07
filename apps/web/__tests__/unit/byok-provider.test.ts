import { beforeEach, describe, expect, it, vi } from "vitest";

const serverEnvMock = vi.hoisted(() =>
	vi.fn<() => Record<string, string | undefined>>(() => ({})),
);
const dbMock = vi.hoisted(() => vi.fn());

vi.mock("@cap/env", () => ({ serverEnv: serverEnvMock }));
vi.mock("@cap/database", () => ({ db: dbMock }));
vi.mock("@cap/database/schema", () => ({ userAiSettings: {} }));
vi.mock("@cap/database/crypto", () => ({
	encrypt: vi.fn(),
	decrypt: vi.fn(),
}));
vi.mock("@/lib/openrouter/catalog", () => ({
	DEFAULT_TRANSCRIPTION_MODEL: "openai/whisper-large-v3-turbo",
	DEFAULT_SUMMARY_MODEL: "google/gemini-3.5-flash-lite",
}));
vi.mock("@/lib/openrouter/client", () => ({
	OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
	OPENROUTER_APP_HEADERS: {
		"HTTP-Referer": "https://screencap.co",
		"X-Title": "Screencap",
	},
}));

import { isAiConfiguredForUser, isTranscriptionAvailable } from "@/lib/ai/byok";
import {
	getAiProviderChain,
	getAiProviderChainWithByok,
} from "@/lib/ai/provider";

const access = {
	apiKey: "sk-or-test",
	model: "google/gemini-3.5-flash-lite",
	zeroDataRetention: false,
};

function mockRow(row: unknown) {
	dbMock.mockReturnValue({
		select: () => ({
			from: () => ({ where: () => ({ limit: async () => [row] }) }),
		}),
	});
}

beforeEach(() => {
	serverEnvMock.mockReturnValue({});
	mockRow(undefined);
});

describe("getAiProviderChainWithByok", () => {
	it("puts the BYOK openrouter selection ahead of the server chain", () => {
		serverEnvMock.mockReturnValue({ GROQ_API_KEY: "g", OPENAI_API_KEY: "o" });
		const chain = getAiProviderChainWithByok("generation", access);
		expect(chain.map((s) => s.provider)).toEqual([
			"openrouter",
			"groq",
			"openai",
		]);
		expect(chain[0]).toMatchObject({
			modelId: access.model,
			supportsStreaming: true,
			supportsTemperature: true,
		});
		expect(chain[0]?.providerOptions).toBeUndefined();
	});

	it("leaves the chain unchanged without BYOK", () => {
		serverEnvMock.mockReturnValue({ GROQ_API_KEY: "g" });
		const expected = getAiProviderChain("generation").map((s) => s.provider);
		expect(
			getAiProviderChainWithByok("generation", null).map((s) => s.provider),
		).toEqual(expected);
		expect(
			getAiProviderChainWithByok("generation").map((s) => s.provider),
		).toEqual(expected);
	});

	it("disables temperature for gpt-5 style BYOK models", () => {
		const [first] = getAiProviderChainWithByok("generation", {
			...access,
			model: "openai/gpt-5-mini",
		});
		expect(first?.supportsTemperature).toBe(false);
	});

	it("creates the model lazily without throwing", () => {
		const [first] = getAiProviderChainWithByok("generation", {
			...access,
			zeroDataRetention: true,
		});
		expect(first?.model()).toBeDefined();
	});
});

describe("isAiConfiguredForUser", () => {
	it("is true with BYOK even when no server provider exists", async () => {
		const crypto = await import("@cap/database/crypto");
		vi.mocked(crypto.decrypt).mockResolvedValue("sk-or-test");
		mockRow({
			openRouterKey: "enc",
			summaryModel: "google/gemini-3.5-flash-lite",
			zeroDataRetention: false,
		});
		expect(await isAiConfiguredForUser("generation", "user-1")).toBe(true);
	});

	it("is false with neither", async () => {
		expect(await isAiConfiguredForUser("generation", "user-1")).toBe(false);
		expect(await isAiConfiguredForUser("generation")).toBe(false);
	});

	it("is true with only a server provider", async () => {
		serverEnvMock.mockReturnValue({ GROQ_API_KEY: "g" });
		expect(await isAiConfiguredForUser("generation", "user-1")).toBe(true);
	});
});

describe("isTranscriptionAvailable", () => {
	it("is true when the server has an AssemblyAI key", async () => {
		serverEnvMock.mockReturnValue({ ASSEMBLY_API_KEY: "a" });
		expect(await isTranscriptionAvailable("user-1")).toBe(true);
	});

	it("is true when the owner has a key and transcription model", async () => {
		const crypto = await import("@cap/database/crypto");
		vi.mocked(crypto.decrypt).mockResolvedValue("sk-or-test");
		mockRow({
			openRouterKey: "enc",
			transcriptionModel: "openai/whisper-large-v3-turbo",
			zeroDataRetention: false,
		});
		expect(await isTranscriptionAvailable("user-1")).toBe(true);
	});

	it("is false when transcription is Off, key missing, or no row", async () => {
		mockRow({ openRouterKey: "enc", transcriptionModel: null });
		expect(await isTranscriptionAvailable("user-1")).toBe(false);
		mockRow({ openRouterKey: null, transcriptionModel: "x" });
		expect(await isTranscriptionAvailable("user-1")).toBe(false);
		mockRow(undefined);
		expect(await isTranscriptionAvailable("user-1")).toBe(false);
	});
});

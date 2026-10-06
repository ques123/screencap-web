import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => vi.fn());
const getByokGeneration = vi.hoisted(() => vi.fn());
const isAiConfigured = vi.hoisted(() => vi.fn());
const runWithAiProviders = vi.hoisted(() => vi.fn());
const generateText = vi.hoisted(() => vi.fn());

vi.mock("@cap/database", () => ({ db: dbMock }));
vi.mock("@cap/database/schema", () => ({
	videos: { id: "id", name: "name", metadata: "metadata", orgId: "orgId" },
	organizations: { id: "id", settings: "settings" },
}));
vi.mock("@cap/env", () => ({ serverEnv: () => ({}) }));
vi.mock("ai", () => ({ generateText }));
vi.mock("@/lib/ai/byok", () => ({ getByokGeneration }));
vi.mock("@/lib/ai/provider", () => ({ isAiConfigured }));
vi.mock("@/lib/ai/run", () => ({ runWithAiProviders }));

import {
	cleanDraftTitle,
	draftLiveTitle,
	trimTranscriptForTitle,
} from "@/lib/ai/live-title";

const input = {
	videoId: "v1",
	ownerId: "u1",
	transcriptText: "we walk through the billing dashboard setup today",
	language: "en",
};

let updates: Array<Record<string, unknown>>;
let affected: number;

function setup(video: Record<string, unknown>, orgSettings: unknown = null) {
	updates = [];
	dbMock.mockReturnValue({
		select: () => ({
			from: () => ({
				leftJoin: () => ({
					where: async () => [
						{
							video: { name: "Cap Recording - 1", settings: null, ...video },
							orgSettings,
						},
					],
				}),
			}),
		}),
		update: () => ({
			set: (values: Record<string, unknown>) => ({
				where: async () => {
					updates.push(values);
					return [{ affectedRows: affected }];
				},
			}),
		}),
	});
}

beforeEach(() => {
	vi.clearAllMocks();
	affected = 1;
	getByokGeneration.mockResolvedValue({ apiKey: "k", model: "m" });
	isAiConfigured.mockReturnValue(false);
	runWithAiProviders.mockImplementation(async (_role, run) =>
		run({ model: () => "model" }),
	);
	generateText.mockResolvedValue({ text: '"Billing Dashboard Setup."' });
});

describe("skip rules", () => {
	it("skips manually edited titles", async () => {
		setup({ metadata: { titleManuallyEdited: true } });
		expect(await draftLiveTitle(input)).toMatchObject({ status: "skipped" });
		expect(generateText).not.toHaveBeenCalled();
	});

	it("skips when the final generation is complete", async () => {
		setup({ metadata: { aiGenerationStatus: "COMPLETE" } });
		expect(await draftLiveTitle(input)).toMatchObject({ status: "skipped" });
		expect(updates).toHaveLength(0);
	});

	it("skips when no AI is available", async () => {
		getByokGeneration.mockResolvedValue(null);
		setup({ metadata: {} });
		expect(await draftLiveTitle(input)).toEqual({
			status: "skipped",
			reason: "no AI available",
		});
	});

	it("falls back to the server provider when there is no BYOK", async () => {
		getByokGeneration.mockResolvedValue(null);
		isAiConfigured.mockReturnValue(true);
		setup({ metadata: {} });
		expect((await draftLiveTitle(input)).status).toBe("updated");
	});

	it("skips when transcripts are disabled for the org or video", async () => {
		setup({ metadata: {} }, { disableTranscript: true });
		expect(await draftLiveTitle(input)).toMatchObject({ status: "skipped" });
		setup({ metadata: {}, settings: { disableTranscript: true } });
		expect(await draftLiveTitle(input)).toMatchObject({ status: "skipped" });
		expect(generateText).not.toHaveBeenCalled();
	});
});

describe("title cleaning", () => {
	it("strips quotes, markdown, periods and caps length", () => {
		expect(cleanDraftTitle('"Billing **Setup**."\n')).toBe("Billing Setup");
		expect(cleanDraftTitle("Title: Hello   world.")).toBe("Hello world");
		expect(cleanDraftTitle("a".repeat(200))).toHaveLength(80);
	});

	it("caps the transcript at head plus tail", () => {
		const out = trimTranscriptForTitle(
			`${"a".repeat(3000)}${"b".repeat(9000)}`,
		);
		expect(out.length).toBeLessThan(6100);
		expect(out.startsWith("a")).toBe(true);
		expect(out.endsWith("b")).toBe(true);
	});
});

describe("write path", () => {
	it("sets aiTitle and replaces a default name", async () => {
		setup({ metadata: {} });
		expect(await draftLiveTitle(input)).toEqual({
			status: "updated",
			title: "Billing Dashboard Setup",
		});
		expect(updates).toHaveLength(2);
		expect(updates[1]).toEqual({ name: "Billing Dashboard Setup" });
		expect(generateText.mock.calls[0]?.[0]).toMatchObject({
			maxOutputTokens: 60,
		});
	});

	it("sets aiTitle but keeps a custom name", async () => {
		setup({ name: "My own title", metadata: {} });
		expect((await draftLiveTitle(input)).status).toBe("updated");
		expect(updates).toHaveLength(1);
		expect(updates[0]).toHaveProperty("metadata");
	});

	it("replaces the previous draft title", async () => {
		setup({ name: "Old draft", metadata: { aiTitle: "Old draft" } });
		await draftLiveTitle(input);
		expect(updates[1]).toEqual({ name: "Billing Dashboard Setup" });
	});

	it("skips quietly when the guarded metadata update matches nothing", async () => {
		affected = 0;
		setup({ metadata: {} });
		expect(await draftLiveTitle(input)).toMatchObject({ status: "skipped" });
		expect(updates).toHaveLength(1);
	});
});

describe("never throws", () => {
	it("returns failed when the db or model errors", async () => {
		dbMock.mockImplementation(() => {
			throw new Error("db down");
		});
		expect(await draftLiveTitle(input)).toEqual({
			status: "failed",
			reason: "db down",
		});
		setup({ metadata: {} });
		runWithAiProviders.mockRejectedValue(new Error("all failed"));
		expect(await draftLiveTitle(input)).toMatchObject({ status: "failed" });
	});
});

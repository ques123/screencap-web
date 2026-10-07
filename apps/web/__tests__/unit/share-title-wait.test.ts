import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rows: { current: unknown[] } = { current: [] };
const dbError: { current: Error | null } = { current: null };

vi.mock("@cap/database", () => ({
	db: () => ({
		select: () => ({
			from: () => ({
				where: () => ({
					limit: async () => {
						if (dbError.current) throw dbError.current;
						const next =
							rows.current.length > 1 ? rows.current.shift() : rows.current[0];
						return [next];
					},
				}),
			}),
		}),
	}),
}));
vi.mock("@cap/database/schema", () => ({
	videos: {
		id: "id",
		name: "name",
		createdAt: "c",
		metadata: "m",
		transcriptionStatus: "t",
	},
}));
vi.mock("drizzle-orm", () => ({ eq: () => ({}) }));
vi.mock("@cap/web-domain", () => ({
	Video: { VideoId: { make: (v: string) => v } },
}));

import { waitForGeneratedTitle } from "@/lib/share-title-wait";

const NOW = new Date("2026-10-06T12:00:00Z");
const row = (over: Record<string, unknown> = {}) => ({
	name: "Cap Recording",
	createdAt: new Date(NOW.getTime() - 20_000),
	metadata: {},
	transcriptionStatus: null,
	...over,
});

describe("waitForGeneratedTitle", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		dbError.current = null;
	});
	afterEach(() => vi.useRealTimers());

	it.each([
		["old video", row({ createdAt: new Date(NOW.getTime() - 10 * 60_000) })],
		["manually edited", row({ metadata: { titleManuallyEdited: true } })],
		["existing aiTitle", row({ metadata: { aiTitle: "Done" } })],
		[
			"nothing in flight",
			row({
				transcriptionStatus: "COMPLETE",
				metadata: { aiGenerationStatus: "COMPLETE" },
			}),
		],
	])("does not wait for %s", async (_label, r) => {
		rows.current = [r];
		expect(await waitForGeneratedTitle("v1")).toBeNull();
	});

	it("returns the new name as soon as aiTitle appears", async () => {
		rows.current = [
			row(),
			row(),
			row({
				name: "Pricing walkthrough",
				metadata: { aiTitle: "Pricing walkthrough" },
			}),
		];
		const p = waitForGeneratedTitle("v1");
		await vi.advanceTimersByTimeAsync(1000);
		expect(await p).toBe("Pricing walkthrough");
	});

	it("returns the latest name at timeout", async () => {
		rows.current = [row()];
		const p = waitForGeneratedTitle("v1", { maxWaitMs: 2000, pollMs: 500 });
		await vi.advanceTimersByTimeAsync(2500);
		expect(await p).toBe("Cap Recording");
	});

	it("returns null on a DB error", async () => {
		dbError.current = new Error("boom");
		expect(await waitForGeneratedTitle("v1")).toBeNull();
	});
});

import { Context, Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
	results: [] as unknown[][],
	selects: [] as unknown[],
}));

vi.mock("@cap/database", () => {
	const makeChain = () => {
		const result = state.results.shift() ?? [];
		const chain: Record<string, unknown> = {};
		for (const m of [
			"select",
			"from",
			"where",
			"groupBy",
			"orderBy",
			"limit",
			"innerJoin",
		]) {
			chain[m] = (...args: unknown[]) => {
				if (m === "select") state.selects.push(args[0]);
				return chain;
			};
		}
		// biome-ignore lint/suspicious/noThenProperty: drizzle builders are thenables
		chain.then = (resolve: (v: unknown) => unknown) => resolve(result);
		return chain;
	};
	return { db: () => makeChain() };
});

vi.mock("@cap/database/schema", () => {
	const col = (name: string) => ({ name });
	return {
		videoViews: {
			tenantId: col("tenant_id"),
			videoId: col("video_id"),
			sessionId: col("session_id"),
			createdAt: col("created_at"),
			country: col("country"),
			city: col("city"),
			browser: col("browser"),
			os: col("os"),
			device: col("device"),
		},
		videos: { id: col("id"), orgId: col("org_id"), name: col("name") },
		comments: {},
		spaceVideos: {},
	};
});

vi.mock("drizzle-orm", () => ({
	and: (...a: unknown[]) => ({ and: a }),
	between: (...a: unknown[]) => ({ between: a }),
	desc: (a: unknown) => ({ desc: a }),
	eq: (...a: unknown[]) => ({ eq: a }),
	inArray: (...a: unknown[]) => ({ inArray: a }),
	ne: (...a: unknown[]) => ({ ne: a }),
}));

vi.mock("drizzle-orm/sql", () => ({
	sql: (strings: TemplateStringsArray) => ({ sql: strings.join("?") }),
}));

vi.mock("@cap/web-backend", () => ({
	Tinybird: Context.GenericTag<{ enabled: boolean }>("Tinybird"),
}));

vi.mock("@/lib/server", async () => {
	const { Tinybird } = await import("@cap/web-backend");
	return {
		runPromise: (effect: Effect.Effect<unknown, unknown, never>) =>
			Effect.runPromise(
				(effect as Effect.Effect<unknown, unknown, unknown>).pipe(
					Effect.provideService(Tinybird as never, { enabled: false }),
				) as Effect.Effect<unknown>,
			),
	};
});

import {
	queryBrowsersMysql,
	queryCitiesMysql,
	queryCountriesMysql,
	queryDevicesMysql,
	queryTopCapsMysql,
	queryViewSeriesMysql,
} from "@/app/(org)/dashboard/analytics/mysql-queries";

const filter = {
	tenantId: "org1",
	from: new Date("2026-10-01T00:00:00Z"),
	to: new Date("2026-10-03T12:00:00Z"),
};

beforeEach(() => {
	state.results = [];
	state.selects = [];
});

describe("analytics mysql queries", () => {
	it("normalises hourly and daily bucket strings", async () => {
		state.results = [
			[
				{ bucket: "2026-10-01T05:00:00Z", views: "3" },
				{ bucket: "2026-10-01 06:00:00", views: 2 },
				{ bucket: null, views: 9 },
			],
		];
		expect(await queryViewSeriesMysql(filter, "hour")).toEqual([
			{ bucket: "2026-10-01T05:00:00Z", views: 3 },
			{ bucket: "2026-10-01T06:00:00Z", views: 2 },
		]);
		state.results = [[{ bucket: "2026-10-02", views: 4 }]];
		expect(await queryViewSeriesMysql(filter, "day")).toEqual([
			{ bucket: "2026-10-02T00:00:00Z", views: 4 },
		]);
	});

	it("maps countries, cities (subtitle = country) and numeric counts", async () => {
		state.results = [[{ name: "TH", views: "5" }]];
		expect(await queryCountriesMysql(filter)).toEqual([
			{ name: "TH", views: 5 },
		]);
		state.results = [[{ country: "TH", city: "Bangkok", views: "2" }]];
		expect(await queryCitiesMysql({ ...filter, videoIds: ["v1"] })).toEqual([
			{ name: "Bangkok", subtitle: "TH", views: 2 },
		]);
	});

	it("maps browsers, devices and top caps", async () => {
		state.results = [[{ name: "Chrome", views: 7 }]];
		expect(await queryBrowsersMysql(filter)).toEqual([
			{ name: "Chrome", views: 7 },
		]);
		state.results = [[{ name: "desktop", views: "1" }]];
		expect(await queryDevicesMysql(filter)).toEqual([
			{ name: "desktop", views: 1 },
		]);
		state.results = [
			[
				{ videoId: "v1", views: "8" },
				{ videoId: "", views: 1 },
			],
		];
		expect(await queryTopCapsMysql(filter)).toEqual([
			{ videoId: "v1", views: 8 },
		]);
	});
});

describe("getOrgAnalyticsData with Tinybird disabled", () => {
	it("builds the response from MySQL rows", async () => {
		vi.setSystemTime(new Date("2026-10-03T12:30:00Z"));
		const { getOrgAnalyticsData } = await import(
			"@/app/(org)/dashboard/analytics/data"
		);
		// Order of db() calls: lifetime start (skipped for 7d), caps, text
		// comments, emoji comments, then the 7 MySQL view queries (+ names).
		state.results = [
			[],
			[],
			[],
			[{ bucket: "2026-10-03T00:00:00Z", views: 4 }],
			[{ name: "TH", views: 4 }],
			[{ country: "TH", city: "Bangkok", views: 4 }],
			[
				{ name: "Chrome", views: 3 },
				{ name: "Chrome 120", views: 1 },
			],
			[{ name: "mobile", views: 4 }],
			[{ name: "macOS", views: 4 }],
			[{ videoId: "v1", views: 4 }],
			[{ id: "v1", name: "My cap" }],
		];
		const res = await getOrgAnalyticsData("org1", "7d");
		vi.useRealTimers();
		expect(res.counts.views).toBe(4);
		expect(
			res.chart.find((c) => c.bucket === "2026-10-03T00:00:00Z")?.views,
		).toBe(4);
		expect(res.breakdowns.countries).toEqual([
			{ name: "TH", views: 4, percentage: 1 },
		]);
		expect(res.breakdowns.devices[0]).toMatchObject({ name: "Mobile" });
		expect(res.breakdowns.browsers[0]).toMatchObject({
			name: "Chrome",
			views: 4,
		});
		expect(res.breakdowns.topCaps).toEqual([
			{ id: "v1", name: "My cap", views: 4, percentage: 1 },
		]);
	});
});

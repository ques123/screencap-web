import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@cap/database", () => ({ db: () => ({}) }));
vi.mock("@cap/env", () => ({ serverEnv: () => ({}) }));
vi.mock("next/navigation", () => ({ notFound: () => {} }));
vi.mock("@cap/database/auth/session", () => ({ getCurrentUser: () => null }));

import {
	addDays,
	bangkokDay,
	bangkokDayStart,
	bucketSourcesDaily,
	dayRange,
	parseStatsRange,
	platformFor,
	statsWindow,
	zeroFillDaily,
} from "@/lib/screencap-admin/analytics";

describe("Bangkok days", () => {
	it("moves 17:30 UTC onto the next Bangkok day", () => {
		expect(bangkokDay(new Date("2026-10-27T17:30:00Z"))).toBe("2026-10-28");
		expect(bangkokDay(new Date("2026-10-27T16:59:59Z"))).toBe("2026-10-27");
		expect(bangkokDay(new Date("2026-10-27T17:00:00Z"))).toBe("2026-10-28");
	});

	it("starts a Bangkok day at 17:00 UTC the day before", () => {
		expect(bangkokDayStart("2026-10-28").toISOString()).toBe(
			"2026-10-27T17:00:00.000Z",
		);
	});

	it("does day math across month and year ends", () => {
		expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
		expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
		expect(dayRange("2026-10-30", "2026-11-02")).toEqual([
			"2026-10-30",
			"2026-10-31",
			"2026-11-01",
			"2026-11-02",
		]);
	});
});

describe("statsWindow", () => {
	it("7d is today plus the 6 days before, previous is the 7 before that", () => {
		expect(statsWindow("7d", "2026-10-28", null)).toEqual({
			from: "2026-10-22",
			to: "2026-10-28",
			previous: { from: "2026-10-15", to: "2026-10-21" },
		});
	});

	it("30d has a 30-day previous window", () => {
		const w = statsWindow("30d", "2026-10-28", null);
		expect(dayRange(w.from, w.to)).toHaveLength(30);
		const p = w.previous as { from: string; to: string };
		expect(dayRange(p.from, p.to)).toHaveLength(30);
		expect(addDays(p.to, 1)).toBe(w.from);
	});

	it("all starts at the first sign-up day and has no previous", () => {
		expect(statsWindow("all", "2026-10-28", "2026-10-02")).toEqual({
			from: "2026-10-02",
			to: "2026-10-28",
			previous: null,
		});
		expect(statsWindow("all", "2026-10-28", null).from).toBe("2026-10-28");
	});

	it("parses ranges with a 30d default", () => {
		expect(parseStatsRange("7d")).toBe("7d");
		expect(parseStatsRange("all")).toBe("all");
		expect(parseStatsRange("bogus")).toBe("30d");
		expect(parseStatsRange(undefined)).toBe("30d");
	});
});

describe("zeroFillDaily", () => {
	it("fills missing days with zeros and keeps given values", () => {
		const out = zeroFillDaily(
			"2026-10-26",
			"2026-10-28",
			new Map([["2026-10-27", { signups: 2, views: 5 }]]),
		);
		expect(out.map((d) => d.day)).toEqual([
			"2026-10-26",
			"2026-10-27",
			"2026-10-28",
		]);
		expect(out[0]).toEqual({
			day: "2026-10-26",
			signups: 0,
			recordings: 0,
			shared: 0,
			views: 0,
			viewers: 0,
		});
		expect(out[1]?.signups).toBe(2);
		expect(out[1]?.views).toBe(5);
	});
});

describe("bucketSourcesDaily", () => {
	const days = ["2026-10-27", "2026-10-28"];
	const e = (day: string, label: string, n = 1) =>
		Array.from({ length: n }, () => ({ day, label }));

	it("keeps the top 5 and sums the rest under Other", () => {
		const entries = [
			...e("2026-10-27", "A", 6),
			...e("2026-10-27", "B", 5),
			...e("2026-10-28", "C", 4),
			...e("2026-10-28", "D", 3),
			...e("2026-10-28", "E", 2),
			...e("2026-10-27", "F", 1),
			...e("2026-10-28", "G", 1),
		];
		const out = bucketSourcesDaily(days, entries);
		expect(out[0]?.counts).toEqual({
			A: 6,
			B: 5,
			C: 0,
			D: 0,
			E: 0,
			Other: 1,
		});
		expect(out[1]?.counts).toEqual({
			A: 0,
			B: 0,
			C: 4,
			D: 3,
			E: 2,
			Other: 1,
		});
	});

	it("omits Other when there are 5 or fewer labels, and zero-fills", () => {
		const out = bucketSourcesDaily(days, e("2026-10-28", "Direct", 2));
		expect(out).toEqual([
			{ day: "2026-10-27", counts: { Direct: 0 } },
			{ day: "2026-10-28", counts: { Direct: 2 } },
		]);
	});
});

describe("platformFor", () => {
	it("maps recorded clients", () => {
		expect(platformFor("desktop", null)).toBe("mac");
		expect(platformFor("web-recorder", null)).toBe("browser");
		expect(platformFor("extension", null)).toBe("extension");
		expect(platformFor("web-upload", null)).toBe("upload");
		expect(platformFor("loom-import", null)).toBe("upload");
		expect(platformFor("mobile", null)).toBe("other");
		expect(platformFor("api", null)).toBe("other");
	});

	it("prefers the client over the source type", () => {
		expect(platformFor("extension", "desktopMP4")).toBe("extension");
	});

	it("falls back to the source type without a client row", () => {
		expect(platformFor(null, "desktopMP4")).toBe("mac");
		expect(platformFor(null, "desktopSegments")).toBe("mac");
		expect(platformFor(undefined, "webMP4")).toBe("browser");
		expect(platformFor(null, "MediaConvert")).toBe("other");
		expect(platformFor(null, null)).toBe("other");
	});
});

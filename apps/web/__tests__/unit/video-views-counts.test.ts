import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	rows: [] as Array<{ videoId: string; views: number | string }>,
	groupBy: vi.fn(),
	where: vi.fn(),
	inArray: vi.fn(),
	eq: vi.fn(),
	gte: vi.fn(),
}));

vi.mock("@cap/database", () => ({
	db: () => ({
		select: () => ({
			from: () => ({
				where: (...args: unknown[]) => {
					mocks.where(...args);
					return { groupBy: () => Promise.resolve(mocks.rows) };
				},
			}),
		}),
	}),
}));
vi.mock("@cap/database/schema", () => ({
	videoViews: {
		videoId: "videoId",
		sessionId: "sessionId",
		tenantId: "tenantId",
		createdAt: "createdAt",
	},
}));
vi.mock("drizzle-orm", () => ({
	and: (...a: unknown[]) => ({ and: a.filter(Boolean) }),
	countDistinct: (c: unknown) => ({ countDistinct: c }),
	inArray: (...a: unknown[]) => {
		mocks.inArray(...a);
		return { inArray: a };
	},
	eq: (...a: unknown[]) => {
		mocks.eq(...a);
		return { eq: a };
	},
	gte: (...a: unknown[]) => {
		mocks.gte(...a);
		return { gte: a };
	},
}));

import { countViewsForVideos } from "../../../../packages/web-backend/src/VideoViews/index";

describe("countViewsForVideos", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.rows = [];
	});

	it("returns an empty map without querying when no ids", async () => {
		const result = await countViewsForVideos({ videoIds: [] });
		expect(result.size).toBe(0);
		expect(mocks.where).not.toHaveBeenCalled();
	});

	it("maps counts and defaults missing videos to 0", async () => {
		mocks.rows = [{ videoId: "a", views: "3" }];
		const result = await countViewsForVideos({
			videoIds: ["a", "b", "a"] as never,
		});
		expect(result.get("a" as never)).toBe(3);
		expect(result.get("b" as never)).toBe(0);
		expect(result.size).toBe(2);
		expect(mocks.inArray).toHaveBeenCalledWith("videoId", ["a", "b"]);
	});

	it("applies tenant and since filters only when given", async () => {
		const since = new Date("2026-01-01T00:00:00Z");
		await countViewsForVideos({
			videoIds: ["a"] as never,
			tenantId: "org1",
			since,
		});
		expect(mocks.eq).toHaveBeenCalledWith("tenantId", "org1");
		expect(mocks.gte).toHaveBeenCalledWith("createdAt", since);

		vi.clearAllMocks();
		await countViewsForVideos({ videoIds: ["a"] as never });
		expect(mocks.eq).not.toHaveBeenCalled();
		expect(mocks.gte).not.toHaveBeenCalled();
	});
});

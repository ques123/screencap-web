import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
	videoRows: [] as unknown[],
	insertValues: vi.fn(),
	insertFails: false,
	appendEvents: vi.fn(),
	currentUser: null as null | { id: string },
}));

vi.mock("@cap/database", () => ({
	db: () => ({
		select: () => ({
			from: () => ({
				leftJoin: () => ({
					where: () => ({ limit: async () => state.videoRows }),
				}),
			}),
		}),
		insert: () => ({
			values: async (values: unknown) => {
				state.insertValues(values);
				if (state.insertFails) throw new Error("db down");
			},
		}),
	}),
}));

vi.mock("@cap/database/schema", () => ({
	videos: {
		id: "id",
		ownerId: "ownerId",
		firstViewEmailSentAt: "f",
		name: "n",
		createdAt: "c",
		updatedAt: "u",
	},
	videoUploads: { videoId: "videoId" },
	videoViews: { __table: "video_views" },
}));

vi.mock("drizzle-orm", () => ({ eq: () => ({}) }));

vi.mock("@cap/web-backend", async () => {
	const { Context, Effect } = await import("effect");
	class Tinybird extends Context.Tag("Tinybird")<
		Tinybird,
		{ appendEvents: (events: unknown[]) => Effect.Effect<void> }
	>() {}
	return {
		Tinybird,
		provideOptionalAuth: <A, E, R>(effect: Effect.Effect<A, E, R>) => effect,
	};
});

vi.mock("@cap/web-domain", async () => {
	const { Context } = await import("effect");
	class CurrentUser extends Context.Tag("CurrentUser")<
		CurrentUser,
		{ id: string }
	>() {}
	return { CurrentUser, Video: { VideoId: { make: (id: string) => id } } };
});

vi.mock("@/lib/server", async () => {
	const { Effect } = await import("effect");
	const { Tinybird } = await import("@cap/web-backend");
	const { CurrentUser } = await import("@cap/web-domain");
	return {
		runPromise: (effect: Effect.Effect<unknown, unknown, never>) => {
			let provided: Effect.Effect<unknown, unknown, never> = (
				effect as Effect.Effect<unknown, unknown, unknown>
			).pipe(
				Effect.provideService(
					Tinybird as never,
					{
						appendEvents: state.appendEvents,
					} as never,
				),
			) as never;
			if (state.currentUser) {
				provided = provided.pipe(
					Effect.provideService(
						CurrentUser as never,
						state.currentUser as never,
					),
				) as never;
			}
			return Effect.runPromise(provided);
		},
	};
});

vi.mock("@/lib/Notification", () => ({
	createAnonymousViewNotification: vi.fn(async () => {}),
	sendFirstViewEmail: vi.fn(async () => {}),
}));

vi.mock("@/lib/anonymous-names", () => ({ getAnonymousName: () => "Anon" }));

import { POST } from "@/app/api/analytics/track/route";

const OLD = new Date("2026-01-01T00:00:00Z");
const CHROME =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const makeRequest = (
	headers: Record<string, string> = {},
	body: Record<string, unknown> = {},
) => {
	const h = new Headers({ "user-agent": CHROME, ...headers });
	return {
		headers: h,
		nextUrl: { hostname: "screencap.co" },
		json: async () => ({ videoId: "vid1", sessionId: "sess-1", ...body }),
	} as never;
};

beforeEach(() => {
	state.videoRows = [
		{
			ownerId: "owner1",
			firstViewEmailSentAt: new Date(),
			videoName: "v",
			createdAt: OLD,
			updatedAt: OLD,
			activeUploadVideoId: null,
		},
	];
	state.insertValues.mockClear();
	state.appendEvents.mockReset();
	state.appendEvents.mockReturnValue(Effect.void);
	state.insertFails = false;
	state.currentUser = null;
});

describe("analytics track route", () => {
	it("inserts a video_views row with geo and ua fields", async () => {
		const res = await POST(
			makeRequest(
				{
					"cf-ipcountry": "th",
					"cf-region": "Bangkok",
					"cf-ipcity": "Bang%20Rak",
				},
				{ orgId: "org1" },
			),
		);
		expect(res.status).toBe(200);
		expect(state.insertValues).toHaveBeenCalledTimes(1);
		expect(state.insertValues.mock.calls[0]?.[0]).toMatchObject({
			videoId: "vid1",
			tenantId: "org1",
			ownerId: "owner1",
			sessionId: "sess-1",
			viewerUserId: null,
			country: "TH",
			region: "Bangkok",
			city: "Bang Rak",
			browser: "Chrome",
			os: "Mac OS",
			device: "desktop",
		});
		expect(state.appendEvents).toHaveBeenCalledTimes(1);
	});

	it("falls back to vercel headers and blanks Cloudflare XX", async () => {
		await POST(
			makeRequest({
				"cf-ipcountry": "XX",
				"x-vercel-ip-country": "DE",
				"x-vercel-ip-city": "Berlin",
			}),
		);
		expect(state.insertValues.mock.calls[0]?.[0]).toMatchObject({
			country: "DE",
			city: "Berlin",
		});
		state.insertValues.mockClear();
		await POST(makeRequest({ "cf-ipcountry": "T1" }));
		expect(state.insertValues.mock.calls[0]?.[0]).toMatchObject({
			country: "",
		});
	});

	it.each([
		"Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
		"Twitterbot/1.0",
		"curl/8.4.0",
		"Mozilla/5.0 HeadlessChrome/120.0",
		"python-requests/2.31",
	])("skips bots: %s", async (ua) => {
		const res = await POST(makeRequest({ "user-agent": ua }));
		expect(res.status).toBe(200);
		expect(state.insertValues).not.toHaveBeenCalled();
		expect(state.appendEvents).not.toHaveBeenCalled();
	});

	it("skips owner views", async () => {
		state.currentUser = { id: "owner1" };
		await POST(makeRequest());
		expect(state.insertValues).not.toHaveBeenCalled();
	});

	it("records the viewer user id for signed-in non-owners", async () => {
		state.currentUser = { id: "viewer9" };
		await POST(makeRequest());
		expect(state.insertValues.mock.calls[0]?.[0]).toMatchObject({
			viewerUserId: "viewer9",
		});
	});

	it("skips videos that are still uploading", async () => {
		state.videoRows = [
			{
				ownerId: "owner1",
				firstViewEmailSentAt: null,
				videoName: "v",
				createdAt: OLD,
				updatedAt: OLD,
				activeUploadVideoId: "vid1",
			},
		];
		await POST(makeRequest());
		expect(state.insertValues).not.toHaveBeenCalled();
	});

	it("does not fail the response when the insert fails", async () => {
		state.insertFails = true;
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const res = await POST(makeRequest());
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ success: true });
		expect(errorSpy).toHaveBeenCalled();
		errorSpy.mockRestore();
	});
});

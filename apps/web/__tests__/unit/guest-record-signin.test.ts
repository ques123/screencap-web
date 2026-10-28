import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
	user: null as null | Record<string, unknown>,
	selectRows: [] as unknown[][],
	insertValues: vi.fn(),
	updateSet: vi.fn(),
	maxSeconds: 300 as number | null,
}));

vi.mock("@cap/database", () => ({
	db: () => {
		const chain: Record<string, unknown> = {};
		const rows = () => state.selectRows.shift() ?? [];
		const q = {
			from: () => q,
			innerJoin: () => q,
			where: () => q,
			limit: () => Promise.resolve(rows()),
			// biome-ignore lint/suspicious/noThenProperty: awaitable query builder mock
			then: (res: (v: unknown) => unknown) => res(rows()),
		};
		return {
			...chain,
			select: () => q,
			insert: () => ({
				values: (v: unknown) => {
					state.insertValues(v);
					return Object.assign(Promise.resolve(), {
						onDuplicateKeyUpdate: async () => {},
					});
				},
			}),
			update: () => ({
				set: (v: unknown) => {
					state.updateSet(v);
					return { where: async () => {} };
				},
			}),
		};
	},
}));
vi.mock("@cap/database/auth/session", () => ({
	getCurrentUser: async () => state.user,
}));
vi.mock("@cap/database/helpers", () => ({ nanoId: () => "newid" }));
vi.mock("@cap/database/schema", () => ({
	videos: { id: "id", ownerId: "ownerId" },
	screencapVideoClients: { videoId: "videoId" },
	organizations: { id: "id", ownerId: "ownerId", tombstoneAt: "t" },
	organizationMembers: { organizationId: "o", userId: "u" },
	users: { id: "id" },
}));
vi.mock("drizzle-orm", () => ({
	eq: () => ({}),
	and: () => ({}),
	isNull: () => ({}),
}));
vi.mock("@cap/utils", () => ({
	userIsPro: (u: { stripeSubscriptionStatus?: string }) =>
		u.stripeSubscriptionStatus === "active",
}));
vi.mock("@cap/web-domain", () => ({
	Organisation: { OrganisationId: { make: (s: string) => s } },
}));
vi.mock("@/lib/screencap-limits", () => ({
	maxRecordingSecondsFor: async () => state.maxSeconds,
}));

import { GET } from "@/app/api/record/bootstrap/route";
import { POST } from "@/app/api/record/claim/route";
import { mapGuestSignInError } from "@/lib/guest-signin";

const post = (body: unknown) =>
	({ json: async () => body }) as unknown as Request;

beforeEach(() => {
	state.user = null;
	state.selectRows = [];
	state.insertValues.mockClear();
	state.updateSet.mockClear();
	state.maxSeconds = 300;
});

describe("GET /api/record/bootstrap", () => {
	it("401s without a session", async () => {
		const res = await GET();
		expect(res.status).toBe(401);
		expect(res.headers.get("cache-control")).toBe("no-store");
	});

	it("returns the active organisation, pro flag and limit", async () => {
		state.user = {
			id: "u1",
			email: "a@b.co",
			activeOrganizationId: "org2",
			stripeSubscriptionStatus: "active",
		};
		state.selectRows = [[{ id: "org1" }], [{ id: "org2" }]];
		const res = await GET();
		expect(await res.json()).toEqual({
			userId: "u1",
			email: "a@b.co",
			organisationId: "org2",
			isPro: true,
			maxRecordingSeconds: 300,
		});
	});

	it("falls back to the first organisation, and creates one if there is none", async () => {
		state.user = { id: "u1", email: "a@b.co", activeOrganizationId: "gone" };
		state.selectRows = [[{ id: "org1" }], []];
		expect((await (await GET()).json()).organisationId).toBe("org1");

		state.selectRows = [[], []];
		const created = await (await GET()).json();
		expect(created.organisationId).toBe("newid");
		expect(state.insertValues).toHaveBeenCalledTimes(2);
		expect(state.updateSet).toHaveBeenCalled();
		expect(created.isPro).toBe(false);
	});
});

describe("POST /api/record/claim", () => {
	it("401s without a session", async () => {
		expect((await POST(post({ videoId: "v1" }))).status).toBe(401);
	});

	it("400s without a videoId", async () => {
		state.user = { id: "u1" };
		expect((await POST(post({}))).status).toBe(400);
	});

	it("404s for someone else's or a missing video and writes nothing", async () => {
		state.user = { id: "u1" };
		state.selectRows = [[{ ownerId: "other" }]];
		expect((await POST(post({ videoId: "v1" }))).status).toBe(404);
		state.selectRows = [[]];
		expect((await POST(post({ videoId: "v1" }))).status).toBe(404);
		expect(state.insertValues).not.toHaveBeenCalled();
	});

	it("marks the owner's video as guest, every time", async () => {
		state.user = { id: "u1" };
		for (let i = 0; i < 2; i++) {
			state.selectRows = [[{ ownerId: "u1" }]];
			const res = await POST(post({ videoId: "v1" }));
			expect(await res.json()).toEqual({ ok: true });
		}
		expect(state.insertValues).toHaveBeenCalledWith({
			videoId: "v1",
			client: "web-recorder",
			detail: "guest",
		});
	});
});

describe("mapGuestSignInError", () => {
	it("maps every refusal to plain words without naming the rule", () => {
		for (const code of [
			"SignupBlocked",
			"SignupCountryBlocked",
			"AccessDenied",
		]) {
			const out = mapGuestSignInError(code);
			expect(out.kind).toBe("blocked");
			expect(JSON.stringify(out)).not.toMatch(/allowlist|domain|blocklist/i);
		}
		expect(mapGuestSignInError("SignupCountryBlocked")).toMatchObject({
			message: expect.stringContaining("country"),
		});
	});

	it("treats EmailSignin as a wait and anything else as a failure", () => {
		expect(mapGuestSignInError("EmailSignin").kind).toBe("wait");
		expect(mapGuestSignInError(undefined).kind).toBe("failed");
		expect(mapGuestSignInError("Configuration").kind).toBe("failed");
	});
});

describe("nameFromEmail", () => {
	it("turns the local part into a readable name", async () => {
		const { nameFromEmail } = await import("@/lib/guest-bootstrap");
		expect(nameFromEmail("john.smith+work@example.com")).toBe("John Smith");
		expect(nameFromEmail("chris22@questio.co.uk")).toBe("Chris");
		expect(nameFromEmail("ANNA_LEE@x.io")).toBe("Anna Lee");
		expect(nameFromEmail("1234@x.io")).toBe("1234");
	});
});

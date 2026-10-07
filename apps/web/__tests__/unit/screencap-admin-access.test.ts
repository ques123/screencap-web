import { generateKeyPairSync, sign } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env: Record<string, string | undefined> = {};
vi.mock("server-only", () => ({}));
vi.mock("@cap/env", () => ({ serverEnv: () => env }));
vi.mock("@cap/database/auth/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));

import {
	adminEmails,
	isAdminEmail,
	resetAccessCertsCacheForTests,
	verifyAccessJwt,
} from "@/lib/screencap-admin/access";

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
	modulusLength: 2048,
});
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "k1" };
const ISS = "https://team.cloudflareaccess.com";

function b64(o: unknown) {
	return Buffer.from(JSON.stringify(o)).toString("base64url");
}
function makeToken(
	payload: Record<string, unknown>,
	kid = "k1",
	key = privateKey,
) {
	const h = b64({ alg: "RS256", kid });
	const p = b64(payload);
	const s = sign("RSA-SHA256", Buffer.from(`${h}.${p}`), key).toString(
		"base64url",
	);
	return `${h}.${p}.${s}`;
}
const now = () => Math.floor(Date.now() / 1000);
const good = () => ({
	iss: ISS,
	aud: ["AUD1"],
	email: "Chris@Questio.co.uk",
	exp: now() + 600,
	nbf: now() - 10,
});

describe("admin emails", () => {
	it("parses case-insensitively", () => {
		env.SCREENCAP_ADMIN_EMAILS = " A@b.com, C@d.com ";
		expect(adminEmails()).toEqual(["a@b.com", "c@d.com"]);
		expect(isAdminEmail("a@B.com")).toBe(true);
		expect(isAdminEmail("x@y.com")).toBe(false);
		expect(isAdminEmail(null)).toBe(false);
	});
});

describe("verifyAccessJwt", () => {
	beforeEach(() => {
		resetAccessCertsCacheForTests();
		env.SCREENCAP_ACCESS_TEAM_DOMAIN = "team.cloudflareaccess.com";
		env.SCREENCAP_ACCESS_AUD = "AUD1";
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(JSON.stringify({ keys: [jwk] }))),
		);
	});

	it("accepts a valid token", async () => {
		expect(await verifyAccessJwt(makeToken(good()))).toEqual({
			email: "chris@questio.co.uk",
		});
	});
	it("rejects wrong aud, iss, expiry, nbf", async () => {
		expect(
			await verifyAccessJwt(makeToken({ ...good(), aud: ["X"] })),
		).toBeNull();
		expect(
			await verifyAccessJwt(makeToken({ ...good(), iss: "https://evil" })),
		).toBeNull();
		expect(
			await verifyAccessJwt(makeToken({ ...good(), exp: now() - 5 })),
		).toBeNull();
		expect(
			await verifyAccessJwt(makeToken({ ...good(), nbf: now() + 3600 })),
		).toBeNull();
	});
	it("rejects a bad signature and unknown kid", async () => {
		const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
		expect(
			await verifyAccessJwt(makeToken(good(), "k1", other.privateKey)),
		).toBeNull();
		expect(await verifyAccessJwt(makeToken(good(), "nope"))).toBeNull();
	});
	it("rejects garbage and unconfigured", async () => {
		expect(await verifyAccessJwt("a.b")).toBeNull();
		delete env.SCREENCAP_ACCESS_AUD;
		expect(await verifyAccessJwt(makeToken(good()))).toBeNull();
	});
});

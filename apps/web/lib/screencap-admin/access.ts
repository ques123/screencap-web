import "server-only";
import { createPublicKey, type JsonWebKey, verify } from "node:crypto";
import { getCurrentUser } from "@cap/database/auth/session";
import { serverEnv } from "@cap/env";
import { notFound } from "next/navigation";

export function adminEmails(): string[] {
	const raw = serverEnv().SCREENCAP_ADMIN_EMAILS ?? "";
	return raw
		.split(",")
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
	if (!email) return false;
	return adminEmails().includes(email.trim().toLowerCase());
}

type AccessConfig = { issuer: string; aud: string };

function accessConfig(): AccessConfig | null {
	const env = serverEnv();
	const team = env.SCREENCAP_ACCESS_TEAM_DOMAIN?.trim();
	const aud = env.SCREENCAP_ACCESS_AUD?.trim();
	if (!team || !aud) return null;
	const host = team.replace(/^https?:\/\//, "").replace(/\/+$/, "");
	return { issuer: `https://${host}`, aud };
}

type Jwk = JsonWebKey & { kid?: string };
const CERTS_TTL_MS = 10 * 60 * 1000;
let certsCache: { issuer: string; keys: Jwk[]; at: number } | null = null;

async function getCerts(issuer: string, force = false): Promise<Jwk[]> {
	if (
		!force &&
		certsCache &&
		certsCache.issuer === issuer &&
		Date.now() - certsCache.at < CERTS_TTL_MS
	)
		return certsCache.keys;
	const res = await fetch(`${issuer}/cdn-cgi/access/certs`, {
		signal: AbortSignal.timeout(8000),
	});
	if (!res.ok) throw new Error(`Access certs HTTP ${res.status}`);
	const body = (await res.json()) as { keys?: Jwk[] };
	const keys = Array.isArray(body.keys) ? body.keys : [];
	certsCache = { issuer, keys, at: Date.now() };
	return keys;
}

export function resetAccessCertsCacheForTests() {
	certsCache = null;
}

function decodePart(part: string): Record<string, unknown> | null {
	try {
		const value = JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
		return value && typeof value === "object" ? value : null;
	} catch {
		return null;
	}
}

/**
 * Verifies a Cloudflare Access JWT (RS256) against the team's published keys.
 * Returns the token's email, or null for anything wrong. Does not check the admin list.
 */
export async function verifyAccessJwt(
	token: string,
): Promise<{ email: string } | null> {
	try {
		const cfg = accessConfig();
		if (!cfg) return null;
		const parts = token.split(".");
		if (parts.length !== 3) return null;
		const [h, p, s] = parts as [string, string, string];
		const header = decodePart(h);
		const payload = decodePart(p);
		if (!header || !payload) return null;
		if (header.alg !== "RS256" || typeof header.kid !== "string") return null;

		let keys = await getCerts(cfg.issuer);
		let jwk = keys.find((k) => k.kid === header.kid);
		if (!jwk) {
			// Keys rotate: one forced refresh before giving up.
			keys = await getCerts(cfg.issuer, true);
			jwk = keys.find((k) => k.kid === header.kid);
		}
		if (!jwk) return null;

		const key = createPublicKey({ key: jwk, format: "jwk" });
		const ok = verify(
			"RSA-SHA256",
			Buffer.from(`${h}.${p}`),
			key,
			Buffer.from(s, "base64url"),
		);
		if (!ok) return null;

		if (payload.iss !== cfg.issuer) return null;
		const aud = payload.aud;
		const audList = Array.isArray(aud) ? aud : [aud];
		if (!audList.includes(cfg.aud)) return null;
		const now = Math.floor(Date.now() / 1000);
		if (typeof payload.exp !== "number" || payload.exp <= now) return null;
		if (typeof payload.nbf === "number" && payload.nbf > now + 30) return null;
		const email = payload.email;
		if (typeof email !== "string" || !email) return null;
		return { email: email.toLowerCase() };
	} catch (error) {
		console.warn("[screencap-admin] Access JWT check failed", error);
		return null;
	}
}

export async function getAdminUser(): Promise<{
	id: string;
	email: string;
} | null> {
	const user = await getCurrentUser();
	if (!user || !isAdminEmail(user.email)) return null;

	if (accessConfig()) {
		const { headers } = await import("next/headers");
		const token = (await headers()).get("cf-access-jwt-assertion");
		if (!token) return null;
		const claims = await verifyAccessJwt(token);
		if (!claims || !isAdminEmail(claims.email)) return null;
	}
	return { id: user.id, email: user.email.toLowerCase() };
}

export async function requireAdmin(): Promise<{ id: string; email: string }> {
	const admin = await getAdminUser();
	if (!admin) notFound();
	return admin;
}

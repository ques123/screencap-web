import { createHash, randomBytes } from "node:crypto";

export const PKCE_COOKIE_NAME = "or_pkce_verifier";
export const PKCE_COOKIE_PATH = "/api/integrations/openrouter";
export const PKCE_COOKIE_MAX_AGE_SECONDS = 600;

export function createCodeVerifier(): string {
	return randomBytes(32).toString("base64url");
}

export function codeChallengeFor(verifier: string): string {
	return createHash("sha256").update(verifier).digest("base64url");
}

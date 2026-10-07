import { describe, expect, it } from "vitest";
import { codeChallengeFor, createCodeVerifier } from "@/lib/openrouter/pkce";

describe("openrouter pkce", () => {
	it("creates a url-safe verifier of valid length", () => {
		const verifier = createCodeVerifier();
		expect(verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
		expect(createCodeVerifier()).not.toBe(verifier);
	});

	it("matches the RFC 7636 S256 example", () => {
		expect(
			codeChallengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
		).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
	});
});

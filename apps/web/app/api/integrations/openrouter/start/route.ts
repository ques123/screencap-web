import { getCurrentUser } from "@cap/database/auth/session";
import { serverEnv } from "@cap/env";
import { NextResponse } from "next/server";
import {
	codeChallengeFor,
	createCodeVerifier,
	PKCE_COOKIE_MAX_AGE_SECONDS,
	PKCE_COOKIE_NAME,
	PKCE_COOKIE_PATH,
} from "@/lib/openrouter/pkce";

export const dynamic = "force-dynamic";

export async function GET() {
	const webUrl = serverEnv().WEB_URL;
	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.redirect(new URL("/login", webUrl));
	}

	const verifier = createCodeVerifier();
	const authUrl = new URL("https://openrouter.ai/auth");
	authUrl.searchParams.set(
		"callback_url",
		new URL("/api/integrations/openrouter/callback", webUrl).toString(),
	);
	authUrl.searchParams.set("code_challenge", codeChallengeFor(verifier));
	authUrl.searchParams.set("code_challenge_method", "S256");

	const response = NextResponse.redirect(authUrl);
	response.cookies.set(PKCE_COOKIE_NAME, verifier, {
		httpOnly: true,
		secure: true,
		sameSite: "lax",
		path: PKCE_COOKIE_PATH,
		maxAge: PKCE_COOKIE_MAX_AGE_SECONDS,
	});
	return response;
}

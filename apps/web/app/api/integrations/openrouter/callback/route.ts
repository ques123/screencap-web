import { getCurrentUser } from "@cap/database/auth/session";
import { serverEnv } from "@cap/env";
import { type NextRequest, NextResponse } from "next/server";
import { setUserOpenRouterKey } from "@/lib/ai/byok";
import {
	exchangeOpenRouterAuthCode,
	verifyOpenRouterKey,
} from "@/lib/openrouter/client";
import { PKCE_COOKIE_NAME, PKCE_COOKIE_PATH } from "@/lib/openrouter/pkce";

export const dynamic = "force-dynamic";

const settingsPath = "/dashboard/settings/ai";

function finish(param: "connected" | "error", value: string) {
	const url = new URL(settingsPath, serverEnv().WEB_URL);
	url.searchParams.set(param, value);
	const response = NextResponse.redirect(url);
	response.cookies.set(PKCE_COOKIE_NAME, "", {
		httpOnly: true,
		secure: true,
		sameSite: "lax",
		path: PKCE_COOKIE_PATH,
		maxAge: 0,
	});
	return response;
}

export async function GET(request: NextRequest) {
	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.redirect(new URL("/login", serverEnv().WEB_URL));
	}

	const code = request.nextUrl.searchParams.get("code");
	const verifier = request.cookies.get(PKCE_COOKIE_NAME)?.value;
	if (!code || !verifier) return finish("error", "invalid");

	try {
		const key = await exchangeOpenRouterAuthCode(code, verifier);
		const info = await verifyOpenRouterKey(key);
		await setUserOpenRouterKey(user.id, key, info.label);
		return finish("connected", "1");
	} catch (error) {
		console.error(
			"[openrouter-oauth] Connect failed",
			error instanceof Error ? error.message : "Unknown error",
		);
		return finish("error", "failed");
	}
}

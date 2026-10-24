import { db } from "@cap/database";
import { screencapToolEvents } from "@cap/database/schema";
import { type NextRequest, userAgent } from "next/server";
import {
	createRateLimiter,
	isBotUserAgent,
	parseToolEvent,
} from "@/lib/tool-events";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1024;
const allow = createRateLimiter(120, 60_000);

const noContent = () => new Response(null, { status: 204 });

function clientIp(request: NextRequest): string {
	return (
		request.headers.get("cf-connecting-ip") ??
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		"unknown"
	);
}

export async function POST(request: NextRequest) {
	const ua = request.headers.get("user-agent");
	if (isBotUserAgent(ua)) return noContent();
	if (!allow(clientIp(request))) return new Response(null, { status: 429 });

	const declared = Number(request.headers.get("content-length") ?? 0);
	if (declared > MAX_BODY_BYTES) return new Response(null, { status: 413 });
	const text = await request.text();
	if (text.length > MAX_BODY_BYTES) return new Response(null, { status: 413 });

	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return new Response(null, { status: 400 });
	}
	const event = parseToolEvent(parsed, request.headers.get("referer"));
	if (!event) return new Response(null, { status: 400 });

	const agent = userAgent(request);
	const country = request.headers.get("cf-ipcountry");
	try {
		await db()
			.insert(screencapToolEvents)
			.values({
				...event,
				browser: agent.browser.name?.slice(0, 32) ?? null,
				os: agent.os.name?.slice(0, 32) ?? null,
				country:
					country && /^[A-Za-z]{2}$/.test(country)
						? country.toUpperCase()
						: null,
			});
	} catch (error) {
		console.warn("[tool-events] insert failed", error);
	}
	return noContent();
}

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

async function readCapped(
	request: NextRequest,
	max: number,
): Promise<string | null> {
	if (!request.body) return "";
	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > max) {
			await reader.cancel().catch(() => {});
			return null;
		}
		chunks.push(value);
	}
	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return new TextDecoder().decode(bytes);
}

const seenViews = new Set<string>();

function firstView(visitId: string, tool: string): boolean {
	const key = `${visitId}:${tool}`;
	if (seenViews.has(key)) return false;
	if (seenViews.size >= 20_000) seenViews.clear();
	seenViews.add(key);
	return true;
}

export async function POST(request: NextRequest) {
	const ua = request.headers.get("user-agent");
	if (isBotUserAgent(ua)) return noContent();
	if (!allow(clientIp(request))) return new Response(null, { status: 429 });

	const declared = Number(request.headers.get("content-length") ?? 0);
	if (declared > MAX_BODY_BYTES) return new Response(null, { status: 413 });
	const text = await readCapped(request, MAX_BODY_BYTES);
	if (text === null) return new Response(null, { status: 413 });

	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return new Response(null, { status: 400 });
	}
	const event = parseToolEvent(parsed, request.headers.get("referer"));
	if (!event) return new Response(null, { status: 400 });
	if (
		event.step === "view" &&
		event.visitId &&
		!firstView(event.visitId, event.tool)
	)
		return noContent();

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

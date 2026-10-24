import { eq, sql } from "drizzle-orm";
import { db } from "./index.ts";
import {
	type ScreencapClient,
	screencapUserClients,
	screencapVideoClients,
} from "./schema.ts";

export type { ScreencapClient };

type HeaderSource = { get(name: string): string | null | undefined };

const SEEN_WRITE_INTERVAL_MS = 10 * 60_000;
const lastSeenWrites = new Map<string, number>();

function clean(value: string | null | undefined, max: number) {
	const trimmed = value?.trim();
	return trimmed ? trimmed.slice(0, max) : null;
}

export function desktopVersion(headers: HeaderSource): string | null {
	return clean(headers.get("x-cap-desktop-version"), 32);
}

const BROWSERS: [RegExp, string][] = [
	[/Edg\//, "Edge"],
	[/OPR\/|Opera/, "Opera"],
	[/Arc\//, "Arc"],
	[/Brave/, "Brave"],
	[/Firefox\/|FxiOS/, "Firefox"],
	[/Chrome\/|CriOS/, "Chrome"],
	[/Safari\//, "Safari"],
];

const SYSTEMS: [RegExp, string][] = [
	[/iPhone|iPad|iPod/, "iOS"],
	[/Android/, "Android"],
	[/CrOS/, "ChromeOS"],
	[/Mac OS X|Macintosh/, "macOS"],
	[/Windows/, "Windows"],
	[/Linux/, "Linux"],
];

export function describeUserAgent(ua: string | null | undefined) {
	if (!ua) return null;
	const browser = BROWSERS.find(([re]) => re.test(ua))?.[1];
	const os = SYSTEMS.find(([re]) => re.test(ua))?.[1];
	if (!browser && !os) return null;
	if (!browser) return os ?? null;
	return os ? `${browser} on ${os}` : browser;
}

export async function noteUserClient(input: {
	userId: string;
	client: ScreencapClient;
	version?: string | null;
}) {
	const version = clean(input.version, 32) ?? "";
	const key = `${input.userId}:${input.client}:${version}`;
	const now = Date.now();
	const last = lastSeenWrites.get(key);
	if (last && now - last < SEEN_WRITE_INTERVAL_MS) return;
	lastSeenWrites.set(key, now);
	try {
		await db()
			.insert(screencapUserClients)
			.values({
				userId: input.userId as typeof screencapUserClients.$inferInsert.userId,
				client: input.client,
				version,
			})
			.onDuplicateKeyUpdate({ set: { lastSeenAt: sql`now()` } });
	} catch (error) {
		lastSeenWrites.delete(key);
		console.error("[screencap-clients] noteUserClient failed", error);
	}
}

export async function noteVideoClient(input: {
	videoId: string;
	client: ScreencapClient;
	version?: string | null;
	detail?: string | null;
}) {
	try {
		await db()
			.insert(screencapVideoClients)
			.values({
				videoId:
					input.videoId as typeof screencapVideoClients.$inferInsert.videoId,
				client: input.client,
				version: clean(input.version, 32),
				detail: clean(input.detail, 64),
			})
			.onDuplicateKeyUpdate({
				set: { videoId: sql`${screencapVideoClients.videoId}` },
			});
	} catch (error) {
		console.error("[screencap-clients] noteVideoClient failed", error);
	}
}

export async function copyVideoClient(fromVideoId: string, toVideoId: string) {
	try {
		const [row] = await db()
			.select()
			.from(screencapVideoClients)
			.where(
				eq(
					screencapVideoClients.videoId,
					fromVideoId as typeof screencapVideoClients.$inferSelect.videoId,
				),
			)
			.limit(1);
		if (row)
			await noteVideoClient({
				videoId: toVideoId,
				client: row.client,
				version: row.version,
				detail: row.detail,
			});
	} catch (error) {
		console.error("[screencap-clients] copyVideoClient failed", error);
	}
}

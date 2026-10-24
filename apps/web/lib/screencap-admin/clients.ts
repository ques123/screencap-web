import "server-only";
import { db } from "@cap/database";
import {
	authApiKeys,
	importedVideos,
	type ScreencapClient,
	screencapUserClients,
	screencapVideoClients,
	videos,
} from "@cap/database/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { AdminUserClients, RecordedWith } from "./types";

type UserId = typeof screencapUserClients.$inferSelect.userId;

const LABELS: Record<ScreencapClient, string> = {
	desktop: "Mac app",
	"web-recorder": "Web recorder",
	"web-upload": "Upload",
	"loom-import": "Loom import",
	mobile: "Mobile app",
	extension: "Chrome extension",
	api: "API",
};

export function clientLabel(client: string): string {
	return LABELS[client as ScreencapClient] ?? client;
}

export const recordedWithSelect = {
	rwClient: screencapVideoClients.client,
	rwVersion: screencapVideoClients.version,
	rwDetail: screencapVideoClients.detail,
	rwSourceType: sql<
		string | null
	>`JSON_UNQUOTE(JSON_EXTRACT(${videos.source}, '$.type'))`,
	rwScreenshot: videos.isScreenshot,
	rwLoom:
		sql<number>`EXISTS (SELECT 1 FROM ${importedVideos} WHERE ${importedVideos.id} = ${videos.id})`.mapWith(
			Number,
		),
};

export type RecordedWithFields = {
	rwClient: string | null;
	rwVersion: string | null;
	rwDetail: string | null;
	rwSourceType: string | null;
	rwScreenshot: boolean;
	rwLoom: number;
};

export function toRecordedWith(r: RecordedWithFields): RecordedWith {
	if (r.rwClient)
		return {
			label: clientLabel(r.rwClient),
			version: r.rwVersion,
			detail: r.rwDetail,
			inferred: false,
		};
	const inferred = (label: string, detail: string | null = null) => ({
		label,
		version: null,
		detail: r.rwScreenshot ? "Screenshot" : detail,
		inferred: true,
	});
	if (r.rwLoom) return inferred(LABELS["loom-import"]);
	switch (r.rwSourceType) {
		case "desktopSegments":
			return inferred(LABELS.desktop, "Instant");
		case "desktopMP4":
			return inferred(LABELS.desktop, "Studio");
		case "local":
			return inferred(LABELS.desktop);
		case "webMP4":
			return inferred("Web recorder or upload");
		default:
			return inferred("Unknown");
	}
}

export function recordedWithText(r: RecordedWith): string {
	return [r.label, r.version, r.detail].filter(Boolean).join(" · ");
}

export async function getUserClients(
	userId: string,
): Promise<AdminUserClients> {
	const [seen, keys, used] = await Promise.all([
		db()
			.select()
			.from(screencapUserClients)
			.where(eq(screencapUserClients.userId, userId as UserId))
			.orderBy(desc(screencapUserClients.lastSeenAt)),
		db()
			.select({ source: authApiKeys.source, createdAt: authApiKeys.createdAt })
			.from(authApiKeys)
			.where(eq(authApiKeys.userId, userId as UserId))
			.orderBy(desc(authApiKeys.createdAt)),
		db()
			.select(recordedWithSelect)
			.from(videos)
			.leftJoin(
				screencapVideoClients,
				eq(screencapVideoClients.videoId, videos.id),
			)
			.where(eq(videos.ownerId, userId as UserId)),
	]);

	const installed: AdminUserClients["installed"] = seen.map((s) => ({
		label: clientLabel(s.client),
		version: s.version || null,
		firstSeenAt: s.firstSeenAt,
		lastSeenAt: s.lastSeenAt,
		inferred: false,
	}));
	const seenClients = new Set(seen.map((s) => s.client));
	for (const key of keys) {
		if (key.source === "unknown" || seenClients.has(key.source)) continue;
		seenClients.add(key.source);
		installed.push({
			label: clientLabel(key.source),
			version: null,
			firstSeenAt: key.createdAt,
			lastSeenAt: null,
			inferred: true,
		});
	}

	const counts = new Map<string, number>();
	for (const row of used) {
		const label = toRecordedWith(row as RecordedWithFields).label;
		counts.set(label, (counts.get(label) ?? 0) + 1);
	}
	const recordedWith = [...counts]
		.map(([label, count]) => ({ label, count }))
		.sort((a, b) => b.count - a.count);

	return { installed, recordedWith };
}

export async function appsForUsers(
	userIds: string[],
): Promise<Map<string, string[]>> {
	const out = new Map<string, string[]>();
	if (userIds.length === 0) return out;
	const ids = userIds as UserId[];
	const [seen, keys] = await Promise.all([
		db()
			.select({
				userId: screencapUserClients.userId,
				client: screencapUserClients.client,
				version: screencapUserClients.version,
			})
			.from(screencapUserClients)
			.where(inArray(screencapUserClients.userId, ids))
			.orderBy(desc(screencapUserClients.lastSeenAt)),
		db()
			.selectDistinct({
				userId: authApiKeys.userId,
				source: authApiKeys.source,
			})
			.from(authApiKeys)
			.where(
				and(
					inArray(authApiKeys.userId, ids),
					inArray(authApiKeys.source, ["desktop", "extension", "mobile"]),
				),
			),
	]);
	const done = new Set<string>();
	const add = (userId: string, client: string, text: string) => {
		const key = `${userId}:${client}`;
		if (done.has(key)) return;
		done.add(key);
		out.set(userId, [...(out.get(userId) ?? []), text]);
	};
	for (const s of seen)
		add(
			String(s.userId),
			s.client,
			[clientLabel(s.client), s.version].filter(Boolean).join(" "),
		);
	for (const k of keys) add(String(k.userId), k.source, clientLabel(k.source));
	return out;
}

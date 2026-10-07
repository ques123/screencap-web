import "server-only";
import { db } from "@cap/database";
import {
	screencapEmailLog,
	screencapRemovedVideos,
	screencapReports,
	screencapUserAdmin,
	users,
	videos,
	videoViews,
} from "@cap/database/schema";
import { serverEnv } from "@cap/env";
import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";

const count = sql<number>`COUNT(*)`.mapWith(Number);

export function emailProvider(): "cloudflare" | "brevo" | "resend" | "none" {
	const env = serverEnv();
	if (env.CLOUDFLARE_EMAIL_API_TOKEN && env.CLOUDFLARE_EMAIL_ACCOUNT_ID)
		return "cloudflare";
	if (env.BREVO_API_KEY) return "brevo";
	if (env.RESEND_API_KEY) return "resend";
	return "none";
}

export async function overviewStats(): Promise<{
	users: number;
	signups24h: number;
	signups7d: number;
	recordings: number;
	storedSeconds: number;
	views7d: number;
	openReports: number;
	removedPending: number;
	blockedUsers: number;
	email24h: { sent: number; failed: number };
	emailProvider: "cloudflare" | "brevo" | "resend" | "none";
	recentEmailFailures: {
		at: Date;
		toEmail: string;
		subject: string;
		error: string | null;
		provider: string;
	}[];
}> {
	const now = Date.now();
	const day = new Date(now - 24 * 3600 * 1000);
	const week = new Date(now - 7 * 24 * 3600 * 1000);
	const d = db();
	const [
		[u],
		[s24],
		[s7],
		[v],
		[vw],
		[rep],
		[rem],
		[blk],
		[sent],
		[failed],
		failures,
	] = await Promise.all([
		d.select({ n: count }).from(users),
		d.select({ n: count }).from(users).where(gte(users.created_at, day)),
		d.select({ n: count }).from(users).where(gte(users.created_at, week)),
		d
			.select({
				n: count,
				secs: sql<number>`COALESCE(SUM(${videos.duration}), 0)`.mapWith(Number),
			})
			.from(videos),
		d
			.select({ n: count })
			.from(videoViews)
			.where(gte(videoViews.createdAt, week)),
		d
			.select({ n: count })
			.from(screencapReports)
			.where(eq(screencapReports.status, "open")),
		d
			.select({ n: count })
			.from(screencapRemovedVideos)
			.where(inArray(screencapRemovedVideos.state, ["removed", "quarantined"])),
		d
			.select({ n: count })
			.from(screencapUserAdmin)
			.where(isNotNull(screencapUserAdmin.blockedAt)),
		d
			.select({ n: count })
			.from(screencapEmailLog)
			.where(
				and(gte(screencapEmailLog.at, day), eq(screencapEmailLog.ok, true)),
			),
		d
			.select({ n: count })
			.from(screencapEmailLog)
			.where(
				and(gte(screencapEmailLog.at, day), eq(screencapEmailLog.ok, false)),
			),
		d
			.select({
				at: screencapEmailLog.at,
				toEmail: screencapEmailLog.toEmail,
				subject: screencapEmailLog.subject,
				error: screencapEmailLog.error,
				provider: screencapEmailLog.provider,
			})
			.from(screencapEmailLog)
			.where(eq(screencapEmailLog.ok, false))
			.orderBy(desc(screencapEmailLog.id))
			.limit(10),
	]);
	return {
		users: u?.n ?? 0,
		signups24h: s24?.n ?? 0,
		signups7d: s7?.n ?? 0,
		recordings: v?.n ?? 0,
		storedSeconds: v?.secs ?? 0,
		views7d: vw?.n ?? 0,
		openReports: rep?.n ?? 0,
		removedPending: rem?.n ?? 0,
		blockedUsers: blk?.n ?? 0,
		email24h: { sent: sent?.n ?? 0, failed: failed?.n ?? 0 },
		emailProvider: emailProvider(),
		recentEmailFailures: failures,
	};
}

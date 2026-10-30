import "server-only";
import { db } from "@cap/database";
import { screencapToolEvents as t } from "@cap/database/schema";
import { serverEnv } from "@cap/env";
import { and, desc, eq, gte, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { TOOL_SLUGS, type ToolSlug } from "@/lib/tool-events";

export const TOOL_RANGES = [7, 30, 90] as const;
export type ToolRange = (typeof TOOL_RANGES)[number];

export const TOOL_EVENT_RETENTION_DAYS = 90;

export function parseToolRange(v: string | undefined): ToolRange {
	const n = Number(v);
	return (TOOL_RANGES as readonly number[]).includes(n) ? (n as ToolRange) : 30;
}

const num = (e: ReturnType<typeof sql>) => e.mapWith(Number);
const visits = (step: string) =>
	num(sql`COUNT(DISTINCT CASE WHEN ${t.step} = ${step} THEN ${t.visitId} END)`);
const events = (step: string) =>
	num(sql`COALESCE(SUM(${t.step} = ${step}), 0)`);

export type ToolSummary = {
	tool: ToolSlug;
	views: number;
	filesPicked: number;
	convertStarted: number;
	convertOk: number;
	convertFailed: number;
	downloaded: number;
	promptShown: number;
	ctaSignup: number;
	ctaDownload: number;
	signedUp: number;
	funnel: {
		views: number;
		filePicked: number;
		converted: number;
		downloaded: number;
		ctaClick: number;
		signedUp: number;
	};
};

export type ToolDay = {
	day: string;
	tool: ToolSlug;
	views: number;
	conversions: number;
};

export type ToolsReport = {
	since: Date;
	tools: ToolSummary[];
	daily: ToolDay[];
	failuresByBrowser: {
		browser: string;
		failed: number;
		ok: number;
	}[];
	failuresByError: { tool: ToolSlug; errorClass: string; failed: number }[];
	referrers: { label: string; views: number }[];
	countries: { label: string; views: number }[];
	fileSizes: { label: string; files: number }[];
	total: number;
};

export async function toolsReport(range: ToolRange): Promise<ToolsReport> {
	const since = new Date(Date.now() - range * 24 * 3600 * 1000);
	const inRange = gte(t.createdAt, since);
	const d = db();

	const [perTool, daily, byBrowser, byError, refs, countries, sizes] =
		await Promise.all([
			d
				.select({
					tool: t.tool,
					views: visits("view"),
					filePickedVisits: visits("file_selected"),
					convertedVisits: visits("convert_ok"),
					downloadedVisits: visits("downloaded"),
					ctaSignupVisits: visits("cta_signup"),
					ctaDownloadVisits: visits("cta_download"),
					ctaEitherVisits: num(
						sql`COUNT(DISTINCT CASE WHEN ${t.step} IN ('cta_signup','cta_download') THEN ${t.visitId} END)`,
					),
					filesPicked: events("file_selected"),
					convertStarted: events("convert_started"),
					convertOk: events("convert_ok"),
					convertFailed: events("convert_failed"),
					downloaded: events("downloaded"),
					promptShown: events("prompt_shown"),
					ctaSignup: events("cta_signup"),
					ctaDownload: events("cta_download"),
					signedUp: events("signed_up"),
				})
				.from(t)
				.where(inRange)
				.groupBy(t.tool),
			d
				.select({
					day: sql<string>`DATE_FORMAT(${t.createdAt}, '%Y-%m-%d')`,
					tool: t.tool,
					views: visits("view"),
					conversions: events("convert_ok"),
				})
				.from(t)
				.where(and(inRange, inArray(t.step, ["view", "convert_ok"])))
				.groupBy(sql`DATE_FORMAT(${t.createdAt}, '%Y-%m-%d')`, t.tool),
			d
				.select({
					browser: sql<string>`COALESCE(${t.browser}, 'Unknown')`,
					failed: events("convert_failed"),
					ok: events("convert_ok"),
				})
				.from(t)
				.where(and(inRange, inArray(t.step, ["convert_failed", "convert_ok"])))
				.groupBy(sql`COALESCE(${t.browser}, 'Unknown')`)
				.orderBy(desc(events("convert_failed")))
				.limit(12),
			d
				.select({
					tool: t.tool,
					errorClass: sql<string>`COALESCE(${t.errorClass}, 'unknown')`,
					failed: num(sql`COUNT(*)`),
				})
				.from(t)
				.where(and(inRange, eq(t.step, "convert_failed")))
				.groupBy(t.tool, sql`COALESCE(${t.errorClass}, 'unknown')`)
				.orderBy(desc(num(sql`COUNT(*)`)))
				.limit(15),
			d
				.select({
					label: sql<string>`COALESCE(${t.referrerHost}, 'Direct or unknown')`,
					views: num(sql`COUNT(DISTINCT ${t.visitId})`),
				})
				.from(t)
				.where(and(inRange, eq(t.step, "view")))
				.groupBy(sql`COALESCE(${t.referrerHost}, 'Direct or unknown')`)
				.orderBy(desc(num(sql`COUNT(DISTINCT ${t.visitId})`)))
				.limit(10),
			d
				.select({
					label: sql<string>`COALESCE(${t.country}, 'Unknown')`,
					views: num(sql`COUNT(DISTINCT ${t.visitId})`),
				})
				.from(t)
				.where(and(inRange, eq(t.step, "view")))
				.groupBy(sql`COALESCE(${t.country}, 'Unknown')`)
				.orderBy(desc(num(sql`COUNT(DISTINCT ${t.visitId})`)))
				.limit(10),
			d
				.select({
					label: t.sizeBucket,
					files: num(sql`COUNT(*)`),
				})
				.from(t)
				.where(
					and(inRange, eq(t.step, "file_selected"), isNotNull(t.sizeBucket)),
				)
				.groupBy(t.sizeBucket),
		]);

	const byTool = new Map(perTool.map((r) => [r.tool, r]));
	const tools: ToolSummary[] = TOOL_SLUGS.map((slug) => {
		const r = byTool.get(slug);
		return {
			tool: slug,
			views: r?.views ?? 0,
			filesPicked: r?.filesPicked ?? 0,
			convertStarted: r?.convertStarted ?? 0,
			convertOk: r?.convertOk ?? 0,
			convertFailed: r?.convertFailed ?? 0,
			downloaded: r?.downloaded ?? 0,
			promptShown: r?.promptShown ?? 0,
			ctaSignup: r?.ctaSignup ?? 0,
			ctaDownload: r?.ctaDownload ?? 0,
			signedUp: r?.signedUp ?? 0,
			funnel: {
				views: r?.views ?? 0,
				filePicked: r?.filePickedVisits ?? 0,
				converted: r?.convertedVisits ?? 0,
				downloaded: r?.downloadedVisits ?? 0,
				ctaClick: r?.ctaEitherVisits ?? 0,
				signedUp: r?.signedUp ?? 0,
			},
		};
	});

	return {
		since,
		tools,
		daily: daily.filter((r): r is ToolDay =>
			(TOOL_SLUGS as readonly string[]).includes(r.tool),
		),
		failuresByBrowser: byBrowser,
		failuresByError: byError.filter(
			(r): r is ToolsReport["failuresByError"][number] =>
				(TOOL_SLUGS as readonly string[]).includes(r.tool),
		),
		referrers: refs,
		countries,
		fileSizes: sizes.map((s) => ({ label: s.label ?? "", files: s.files })),
		total: tools.reduce((n, x) => n + x.views, 0),
	};
}

export type ToolFile = {
	at: Date;
	tool: ToolSlug;
	fileName: string;
	sizeBucket: string | null;
	rejected: string | null;
	converted: boolean;
	failed: boolean;
	downloaded: boolean;
	browser: string | null;
	os: string | null;
	country: string | null;
};

export const TOOL_FILES_LIMIT = 500;

// Newest files people picked (or had rejected) in the tools, with whether that visit went on to convert
// and download. A file picked twice in one visit shows twice.
export async function toolFiles(range: ToolRange): Promise<ToolFile[]> {
	const since = new Date(Date.now() - range * 24 * 3600 * 1000);
	const later = (step: string) =>
		sql<number>`EXISTS (SELECT 1 FROM ${t} AS o WHERE o.visit_id = ${t.visitId} AND o.tool = ${t.tool} AND o.step = ${step} AND o.created_at >= ${t.createdAt})`.mapWith(
			Number,
		);
	const rows = await db()
		.select({
			at: t.createdAt,
			tool: t.tool,
			step: t.step,
			fileName: t.fileName,
			sizeBucket: t.sizeBucket,
			errorClass: t.errorClass,
			converted: later("convert_ok"),
			failed: later("convert_failed"),
			downloaded: later("downloaded"),
			browser: t.browser,
			os: t.os,
			country: t.country,
		})
		.from(t)
		.where(
			and(
				gte(t.createdAt, since),
				isNotNull(t.fileName),
				inArray(t.step, ["file_selected", "convert_failed"]),
			),
		)
		.orderBy(desc(t.createdAt))
		.limit(TOOL_FILES_LIMIT);
	return rows
		.filter((r) => (TOOL_SLUGS as readonly string[]).includes(r.tool))
		.map((r) => ({
			at: r.at,
			tool: r.tool as ToolSlug,
			fileName: r.fileName ?? "",
			sizeBucket: r.sizeBucket,
			rejected:
				r.step === "convert_failed" ? (r.errorClass ?? "rejected") : null,
			converted: r.step === "file_selected" && r.converted === 1,
			failed: r.step === "file_selected" && r.failed === 1,
			downloaded: r.step === "file_selected" && r.downloaded === 1,
			browser: r.browser,
			os: r.os,
			country: r.country,
		}));
}

export async function purgeToolEvents(opts?: {
	dryRun?: boolean;
	now?: Date;
}): Promise<{ deleted?: number; wouldDelete?: number }> {
	const dryRun =
		opts?.dryRun === true || serverEnv().SCREENCAP_PURGE_DRY_RUN === "1";
	const cutoff = new Date(
		(opts?.now ?? new Date()).getTime() -
			TOOL_EVENT_RETENTION_DAYS * 24 * 3600 * 1000,
	);
	const old = lt(t.createdAt, cutoff);
	if (dryRun) {
		const [row] = await db()
			.select({ n: num(sql`COUNT(*)`) })
			.from(t)
			.where(old);
		return { wouldDelete: row?.n ?? 0 };
	}
	const BATCH = 5000;
	let deleted = 0;
	for (let i = 0; i < 1000; i++) {
		const [res] = await db().delete(t).where(old).limit(BATCH);
		const n = (res as { affectedRows?: number }).affectedRows ?? 0;
		deleted += n;
		if (n < BATCH) break;
	}
	return { deleted };
}

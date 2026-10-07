import { db } from "@cap/database";
import { videoViews } from "@cap/database/schema";
import { and, between, desc, eq, inArray, ne } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";

// MySQL implementation of the Tinybird analytics queries, used when Tinybird is
// disabled. A view is a distinct `sessionId` within the measured group, same as
// the Tinybird `uniq(session_id)` semantics.
//
// Time zone assumption: `video_views.created_at` is a TIMESTAMP and buckets are
// produced with DATE_FORMAT, which renders in the connection session time zone.
// The app (like the existing videos/comments series in data.ts) assumes the
// session time zone is UTC. Range bounds are bound parameters (never
// interpolated), so ids and dates are always parameterised.

export type MysqlViewSeriesRow = { bucket: string; views: number };
export type MysqlBreakdownRow = {
	name: string;
	views: number;
	subtitle?: string;
};
export type MysqlTopCapRow = { videoId: string; views: number };

type Bucket = "hour" | "day";

export interface MysqlAnalyticsFilter {
	tenantId: string;
	from: Date;
	to: Date;
	videoIds?: string[];
}

const LIMIT = 10;

const baseConditions = ({
	tenantId,
	from,
	to,
	videoIds,
}: MysqlAnalyticsFilter) => {
	const conditions = [
		eq(videoViews.tenantId, tenantId),
		between(videoViews.createdAt, from, to),
	];
	if (videoIds && videoIds.length > 0) {
		conditions.push(inArray(videoViews.videoId, videoIds as never[]));
	}
	return conditions;
};

const distinctViews = sql<number>`COUNT(DISTINCT ${videoViews.sessionId})`;

export const normalizeMysqlBucket = (
	input: string | null | undefined,
	bucket: Bucket,
): string | undefined => {
	if (!input) return undefined;
	if (input.endsWith("Z")) return input;
	if (bucket === "day" && input.length === 10) return `${input}T00:00:00Z`;
	return `${input.replace(" ", "T")}Z`;
};

export const queryViewSeriesMysql = async (
	filter: MysqlAnalyticsFilter,
	bucket: Bucket,
): Promise<MysqlViewSeriesRow[]> => {
	const bucketExpr =
		bucket === "hour"
			? sql<string>`DATE_FORMAT(${videoViews.createdAt}, '%Y-%m-%dT%H:00:00Z')`
			: sql<string>`DATE_FORMAT(${videoViews.createdAt}, '%Y-%m-%dT00:00:00Z')`;

	const rows = await db()
		.select({ bucket: bucketExpr, views: distinctViews })
		.from(videoViews)
		.where(and(...baseConditions(filter)))
		.groupBy(bucketExpr)
		.orderBy(bucketExpr);

	return rows
		.map((row) => ({
			bucket: normalizeMysqlBucket(row.bucket, bucket),
			views: Number(row.views) || 0,
		}))
		.filter((row): row is MysqlViewSeriesRow => Boolean(row.bucket));
};

export const queryCountriesMysql = async (
	filter: MysqlAnalyticsFilter,
): Promise<MysqlBreakdownRow[]> => {
	const rows = await db()
		.select({ name: videoViews.country, views: distinctViews })
		.from(videoViews)
		.where(and(...baseConditions(filter), ne(videoViews.country, "")))
		.groupBy(videoViews.country)
		.orderBy(desc(distinctViews))
		.limit(LIMIT);
	return rows.map((row) => ({
		name: row.name,
		views: Number(row.views) || 0,
	}));
};

export const queryCitiesMysql = async (
	filter: MysqlAnalyticsFilter,
): Promise<MysqlBreakdownRow[]> => {
	const rows = await db()
		.select({
			country: videoViews.country,
			city: videoViews.city,
			views: distinctViews,
		})
		.from(videoViews)
		.where(and(...baseConditions(filter), ne(videoViews.city, "")))
		.groupBy(videoViews.country, videoViews.city)
		.orderBy(desc(distinctViews))
		.limit(LIMIT);
	return rows.map((row) => ({
		name: row.city,
		subtitle: row.country,
		views: Number(row.views) || 0,
	}));
};

const queryDimensionMysql = async (
	filter: MysqlAnalyticsFilter,
	column: typeof videoViews.browser | typeof videoViews.os,
	fallback: string,
): Promise<MysqlBreakdownRow[]> => {
	const nameExpr = sql<string>`COALESCE(NULLIF(${column}, ''), ${fallback})`;
	const rows = await db()
		.select({ name: nameExpr, views: distinctViews })
		.from(videoViews)
		.where(and(...baseConditions(filter)))
		.groupBy(nameExpr)
		.orderBy(desc(distinctViews))
		.limit(LIMIT);
	return rows.map((row) => ({
		name: row.name,
		views: Number(row.views) || 0,
	}));
};

export const queryBrowsersMysql = (filter: MysqlAnalyticsFilter) =>
	queryDimensionMysql(filter, videoViews.browser, "unknown");

export const queryOperatingSystemsMysql = (filter: MysqlAnalyticsFilter) =>
	queryDimensionMysql(filter, videoViews.os, "unknown");

export const queryDevicesMysql = async (
	filter: MysqlAnalyticsFilter,
): Promise<MysqlBreakdownRow[]> => {
	const nameExpr = sql<string>`COALESCE(NULLIF(${videoViews.device}, ''), 'desktop')`;
	const rows = await db()
		.select({ name: nameExpr, views: distinctViews })
		.from(videoViews)
		.where(and(...baseConditions(filter)))
		.groupBy(nameExpr)
		.orderBy(desc(distinctViews))
		.limit(LIMIT);
	return rows.map((row) => ({
		name: row.name,
		views: Number(row.views) || 0,
	}));
};

export const queryTopCapsMysql = async (
	filter: MysqlAnalyticsFilter,
): Promise<MysqlTopCapRow[]> => {
	const rows = await db()
		.select({ videoId: videoViews.videoId, views: distinctViews })
		.from(videoViews)
		.where(and(...baseConditions(filter)))
		.groupBy(videoViews.videoId)
		.orderBy(desc(distinctViews))
		.limit(LIMIT);
	return rows
		.map((row) => ({
			videoId: row.videoId as string,
			views: Number(row.views) || 0,
		}))
		.filter((row) => Boolean(row.videoId));
};

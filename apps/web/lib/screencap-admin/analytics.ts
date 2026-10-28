import "server-only";
import { db } from "@cap/database";
import {
	screencapVideoClients,
	users,
	videos,
	videoViews,
} from "@cap/database/schema";
import { getSettings } from "@cap/database/screencap-settings";
import {
	and,
	count,
	countDistinct,
	gte,
	inArray,
	isNull,
	lt,
	min,
	notInArray,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import { adminEmails } from "./access";
import { sourcesForUsers } from "./sources";
import type {
	AdminStats,
	SignupSourceKind,
	StatsDay,
	StatsPlatform,
	StatsRange,
	StatsTotals,
} from "./types";

type UserId = typeof users.$inferSelect.id;

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
// Bangkok has no daylight saving, so a fixed offset is exact.
const BANGKOK_OFFSET_HOURS = 7;
const RANGES: StatsRange[] = ["7d", "30d", "90d", "all"];
const RANGE_DAYS: Record<Exclude<StatsRange, "all">, number> = {
	"7d": 7,
	"30d": 30,
	"90d": 90,
};
const TOP_SOURCES = 5;
const OTHER_LABEL = "Other";
const SOURCES_SINCE = "2026-10-27";

export function parseStatsRange(v: unknown): StatsRange {
	return RANGES.includes(v as StatsRange) ? (v as StatsRange) : "30d";
}

// ── Pure helpers (day math, zero-fill, bucketing, platform mapping) ─────────────

/** The Bangkok calendar day ("YYYY-MM-DD") a UTC instant falls on. */
export function bangkokDay(d: Date): string {
	return new Date(d.getTime() + BANGKOK_OFFSET_HOURS * HOUR_MS)
		.toISOString()
		.slice(0, 10);
}

/** The UTC instant at which a Bangkok day begins (00:00 Bangkok = 17:00 UTC the day before). */
export function bangkokDayStart(day: string): Date {
	return new Date(
		Date.parse(`${day}T00:00:00Z`) - BANGKOK_OFFSET_HOURS * HOUR_MS,
	);
}

export function addDays(day: string, n: number): string {
	return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS)
		.toISOString()
		.slice(0, 10);
}

/** Every day from `from` to `to`, inclusive. */
export function dayRange(from: string, to: string): string[] {
	const out: string[] = [];
	for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
	return out;
}

export type StatsWindow = {
	from: string;
	to: string;
	/** The same-length window right before; null for "all". */
	previous: { from: string; to: string } | null;
};

/**
 * Day bounds for a range. "7d" is today plus the 6 days before it. For "all", `from` is the first
 * sign-up day (falls back to today when there are no users).
 */
export function statsWindow(
	range: StatsRange,
	today: string,
	firstSignupDay: string | null,
): StatsWindow {
	if (range === "all")
		return {
			from: firstSignupDay && firstSignupDay <= today ? firstSignupDay : today,
			to: today,
			previous: null,
		};
	const days = RANGE_DAYS[range];
	const from = addDays(today, -(days - 1));
	const previousTo = addDays(from, -1);
	return {
		from,
		to: today,
		previous: { from: addDays(previousTo, -(days - 1)), to: previousTo },
	};
}

export function emptyTotals(): StatsTotals {
	return { signups: 0, recordings: 0, shared: 0, views: 0, viewers: 0 };
}

/** One zero-filled entry per day from `from` to `to`, with `byDay` values laid over it. */
export function zeroFillDaily(
	from: string,
	to: string,
	byDay: Map<string, Partial<StatsTotals>>,
): StatsDay[] {
	return dayRange(from, to).map((day) => ({
		day,
		...emptyTotals(),
		...byDay.get(day),
	}));
}

/**
 * Per-day counts for the top 5 labels (by period total, ties by name), everything else summed under
 * "Other". Every day is present, and every top label is present on every day.
 */
export function bucketSourcesDaily(
	days: string[],
	entries: { day: string; label: string }[],
): { day: string; counts: Record<string, number> }[] {
	const totals = new Map<string, number>();
	for (const e of entries) totals.set(e.label, (totals.get(e.label) ?? 0) + 1);
	const top = [...totals.entries()]
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.slice(0, TOP_SOURCES)
		.map(([label]) => label);
	const topSet = new Set(top);
	const hasOther = totals.size > top.length;
	const byDay = new Map<string, Record<string, number>>();
	for (const day of days) {
		const counts: Record<string, number> = {};
		for (const label of top) counts[label] = 0;
		if (hasOther) counts[OTHER_LABEL] = 0;
		byDay.set(day, counts);
	}
	for (const e of entries) {
		const counts = byDay.get(e.day);
		if (!counts) continue;
		const key = topSet.has(e.label) ? e.label : OTHER_LABEL;
		counts[key] = (counts[key] ?? 0) + 1;
	}
	return days.map((day) => ({
		day,
		counts: byDay.get(day) as Record<string, number>,
	}));
}

export function emptyPlatforms(): Record<StatsPlatform, number> {
	return { mac: 0, browser: 0, extension: 0, upload: 0, other: 0 };
}

/**
 * Where a recording was made. The recorded client wins; recordings without a client row fall back to
 * the `videos.source` type.
 */
export function platformFor(
	client: string | null | undefined,
	sourceType: string | null | undefined,
): StatsPlatform {
	if (client) {
		switch (client) {
			case "desktop":
				return "mac";
			case "web-recorder":
				return "browser";
			case "extension":
				return "extension";
			case "web-upload":
			case "loom-import":
				return "upload";
			default:
				return "other";
		}
	}
	switch (sourceType) {
		case "desktopMP4":
		case "desktopSegments":
			return "mac";
		case "webMP4":
			return "browser";
		default:
			return "other";
	}
}

// ── Queries ─────────────────────────────────────────────────────────────────────

/** Bangkok calendar day of a UTC timestamp column, as "YYYY-MM-DD". */
function dayOf(col: SQL | { name: string }) {
	return sql<string>`DATE_FORMAT(DATE_ADD(${col}, INTERVAL ${sql.raw(String(BANGKOK_OFFSET_HOURS))} HOUR), '%Y-%m-%d')`;
}

async function internalUserIds(): Promise<UserId[]> {
	const settings = await getSettings();
	const emails = [
		...new Set([...adminEmails(), ...settings.internalEmails]),
	].map((e) => e.trim().toLowerCase());
	if (emails.length === 0) return [];
	const rows = await db()
		.select({ id: users.id })
		.from(users)
		.where(inArray(sql`LOWER(${users.email})`, emails));
	return rows.map((r) => r.id);
}

function sumInto(
	target: StatsTotals,
	days: Map<string, Partial<StatsTotals>>,
	from: string,
	to: string,
) {
	for (const [day, v] of days) {
		if (day < from || day > to) continue;
		target.signups += v.signups ?? 0;
		target.recordings += v.recordings ?? 0;
		target.shared += v.shared ?? 0;
		target.views += v.views ?? 0;
	}
}

export async function adminStats(
	range: StatsRange,
	includeInternal: boolean,
): Promise<AdminStats> {
	const internalIds = await internalUserIds();
	const exclude = includeInternal ? [] : internalIds;
	const now = new Date();
	const today = bangkokDay(now);

	// Conditions that leave internal accounts out (NULL-safe: ownerId / viewerUserId can be NULL).
	const userOk = exclude.length ? notInArray(users.id, exclude) : undefined;
	const ownerOk = exclude.length
		? notInArray(videos.ownerId, exclude)
		: undefined;
	const viewOk = exclude.length
		? and(
				or(isNull(videoViews.ownerId), notInArray(videoViews.ownerId, exclude)),
				or(
					isNull(videoViews.viewerUserId),
					notInArray(videoViews.viewerUserId, exclude),
				),
			)
		: undefined;

	const [firstSignup] = await db()
		.select({ at: min(users.created_at) })
		.from(users)
		.where(userOk);
	const win = statsWindow(
		range,
		today,
		firstSignup?.at ? bangkokDay(new Date(firstSignup.at)) : null,
	);
	const spanFrom = win.previous?.from ?? win.from;
	const spanStart = bangkokDayStart(spanFrom);
	const spanEnd = bangkokDayStart(addDays(win.to, 1));
	const curStart = bangkokDayStart(win.from);

	const [
		signupRows,
		recordingRows,
		viewRows,
		firstViews,
		viewerPeriods,
		platformRows,
		[viewsFloor],
	] = await Promise.all([
		db()
			.select({ id: users.id, day: dayOf(users.created_at) })
			.from(users)
			.where(
				and(
					gte(users.created_at, spanStart),
					lt(users.created_at, spanEnd),
					userOk,
				),
			),
		db()
			.select({ day: dayOf(videos.createdAt), n: count() })
			.from(videos)
			.where(
				and(
					gte(videos.createdAt, spanStart),
					lt(videos.createdAt, spanEnd),
					ownerOk,
				),
			)
			.groupBy(dayOf(videos.createdAt)),
		db()
			.select({
				day: dayOf(videoViews.createdAt),
				n: count(),
				viewers: countDistinct(videoViews.sessionId),
			})
			.from(videoViews)
			.where(
				and(
					gte(videoViews.createdAt, spanStart),
					lt(videoViews.createdAt, spanEnd),
					viewOk,
				),
			)
			.groupBy(dayOf(videoViews.createdAt)),
		// First view per recording (after the exclusions); the day it falls on is the "shared" day.
		db()
			.select({ at: min(videoViews.createdAt) })
			.from(videoViews)
			.where(viewOk)
			.groupBy(videoViews.videoId),
		// Distinct viewers per whole period (a sum of per-day distincts would double count).
		Promise.all(
			[
				{ from: curStart, to: spanEnd },
				...(win.previous
					? [
							{
								from: spanStart,
								to: curStart,
							},
						]
					: []),
			].map(({ from, to }) =>
				db()
					.select({ n: countDistinct(videoViews.sessionId) })
					.from(videoViews)
					.where(
						and(
							gte(videoViews.createdAt, from),
							lt(videoViews.createdAt, to),
							viewOk,
						),
					),
			),
		),
		db()
			.select({
				client: screencapVideoClients.client,
				type: sql<
					string | null
				>`JSON_UNQUOTE(JSON_EXTRACT(${videos.source}, '$.type'))`,
				n: count(),
			})
			.from(videos)
			.leftJoin(
				screencapVideoClients,
				sql`${screencapVideoClients.videoId} = ${videos.id}`,
			)
			.where(
				and(
					gte(videos.createdAt, curStart),
					lt(videos.createdAt, spanEnd),
					ownerOk,
				),
			)
			.groupBy(
				screencapVideoClients.client,
				sql`JSON_UNQUOTE(JSON_EXTRACT(${videos.source}, '$.type'))`,
			),
		db()
			.select({ at: min(videoViews.createdAt) })
			.from(videoViews),
	]);

	const byDay = new Map<string, Partial<StatsTotals>>();
	const slot = (day: string) => {
		let v = byDay.get(day);
		if (!v) {
			v = {};
			byDay.set(day, v);
		}
		return v;
	};
	for (const r of signupRows) {
		const v = slot(r.day);
		v.signups = (v.signups ?? 0) + 1;
	}
	for (const r of recordingRows) slot(r.day).recordings = Number(r.n);
	for (const r of viewRows) {
		const v = slot(r.day);
		v.views = Number(r.n);
		v.viewers = Number(r.viewers);
	}
	for (const r of firstViews) {
		if (!r.at) continue;
		const v = slot(bangkokDay(new Date(r.at)));
		v.shared = (v.shared ?? 0) + 1;
	}

	const totals = emptyTotals();
	sumInto(totals, byDay, win.from, win.to);
	totals.viewers = Number(viewerPeriods[0]?.[0]?.n ?? 0);
	let previous: StatsTotals | null = null;
	if (win.previous) {
		previous = emptyTotals();
		sumInto(previous, byDay, win.previous.from, win.previous.to);
		previous.viewers = Number(viewerPeriods[1]?.[0]?.n ?? 0);
	}
	const daily = zeroFillDaily(win.from, win.to, byDay);

	const platforms = emptyPlatforms();
	for (const r of platformRows)
		platforms[platformFor(r.client, r.type)] += Number(r.n);

	// People who signed up in the period, and how far they got.
	const cohort = signupRows.filter((r) => r.day >= win.from);
	const cohortIds = cohort.map((r) => r.id);
	let recorded = 0;
	let shared = 0;
	if (cohortIds.length > 0) {
		const [recordedRows, sharedRows] = await Promise.all([
			db()
				.selectDistinct({ id: videos.ownerId })
				.from(videos)
				.where(inArray(videos.ownerId, cohortIds)),
			db()
				.selectDistinct({ id: videos.ownerId })
				.from(videos)
				.innerJoin(videoViews, sql`${videoViews.videoId} = ${videos.id}`)
				.where(and(inArray(videos.ownerId, cohortIds), viewOk)),
		]);
		recorded = recordedRows.length;
		shared = sharedRows.length;
	}

	const sourceMap = await sourcesForUsers(cohortIds);
	const labelled = cohort.map((r) => ({
		day: r.day,
		source: sourceMap.get(String(r.id)),
	}));
	const sourceCounts = new Map<
		string,
		{ label: string; kind: SignupSourceKind; count: number }
	>();
	for (const r of labelled) {
		if (!r.source) continue;
		const e = sourceCounts.get(r.source.label) ?? {
			label: r.source.label,
			kind: r.source.kind,
			count: 0,
		};
		e.count += 1;
		sourceCounts.set(r.source.label, e);
	}
	const sources = [...sourceCounts.values()].sort(
		(a, b) => b.count - a.count || a.label.localeCompare(b.label),
	);
	const sourcesDaily = bucketSourcesDaily(
		dayRange(win.from, win.to),
		labelled.flatMap((r) =>
			r.source ? [{ day: r.day, label: r.source.label }] : [],
		),
	);

	return {
		range,
		includeInternal,
		from: win.from,
		to: win.to,
		totals,
		previous,
		daily,
		funnel: { signedUp: cohortIds.length, recorded, shared },
		platforms,
		sources,
		sourcesDaily,
		internalAccounts: internalIds.length,
		viewsSince: viewsFloor?.at ? bangkokDay(new Date(viewsFloor.at)) : null,
		sourcesSince: SOURCES_SINCE,
	};
}

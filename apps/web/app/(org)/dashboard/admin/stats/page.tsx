import { Card, CardDescription, CardTitle } from "@cap/ui";
import Link from "next/link";
import { adminStats, parseStatsRange } from "@/lib/screencap-admin";
import type { StatsPlatform, StatsRange } from "@/lib/screencap-admin/types";
import { EmptyState, formatNumber, strParam } from "../_components/format";
import { DailyChart, SourcesChart } from "./StatsCharts";

export const dynamic = "force-dynamic";

const RANGES: { value: StatsRange; label: string }[] = [
	{ value: "7d", label: "7 days" },
	{ value: "30d", label: "30 days" },
	{ value: "90d", label: "90 days" },
	{ value: "all", label: "All time" },
];

const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

function longDay(day: string | null): string {
	if (!day) return "the first view";
	const [y, m, d] = day.split("-");
	return `${Number(d)} ${MONTHS[Number(m) - 1] ?? ""} ${y}`;
}

function percent(n: number, of: number): string {
	if (of <= 0) return "0%";
	const p = (n / of) * 100;
	return `${p >= 10 || p === 0 || p === 100 ? Math.round(p) : p.toFixed(1)}%`;
}

function Change({ now, before }: { now: number; before: number | undefined }) {
	if (before === undefined) return null;
	if (before === 0) {
		return now === 0 ? (
			<span className="text-xs text-gray-10">No change</span>
		) : (
			<span className="text-xs text-green-600">New</span>
		);
	}
	const pct = Math.round(((now - before) / before) * 100);
	if (pct === 0) return <span className="text-xs text-gray-10">No change</span>;
	return (
		<span className={`text-xs ${pct > 0 ? "text-green-600" : "text-red-600"}`}>
			{pct > 0 ? "+" : "−"}
			{Math.abs(pct)}% vs previous period
		</span>
	);
}

function Headline({
	label,
	value,
	before,
	hint,
}: {
	label: string;
	value: number;
	before: number | undefined;
	hint?: string;
}) {
	return (
		<Card className="space-y-1 h-full">
			<CardDescription>{label}</CardDescription>
			<p className="text-2xl font-medium text-gray-12">{formatNumber(value)}</p>
			<div className="min-h-4">
				<Change now={value} before={before} />
			</div>
			{hint && <p className="text-xs text-gray-10">{hint}</p>}
		</Card>
	);
}

function Bars({
	rows,
	of,
}: {
	rows: { label: string; count: number }[];
	of: number;
}) {
	return (
		<ul className="space-y-3">
			{rows.map((r) => (
				<li key={r.label} className="space-y-1">
					<div className="flex gap-2 justify-between text-sm">
						<span className="text-gray-12">{r.label}</span>
						<span className="text-gray-11 tabular-nums">
							{formatNumber(r.count)}
							{of > 0 && (
								<span className="ml-2 text-gray-10">
									{percent(r.count, of)}
								</span>
							)}
						</span>
					</div>
					<div className="h-2 rounded-full bg-gray-4 overflow-hidden">
						<div
							className="h-full rounded-full bg-gray-12"
							style={{
								width: `${of > 0 ? Math.min(100, (r.count / of) * 100) : 0}%`,
							}}
						/>
					</div>
				</li>
			))}
		</ul>
	);
}

const platformLabels: Record<StatsPlatform, string> = {
	mac: "Mac app",
	browser: "Browser, signed in",
	guest: "Browser, no account",
	extension: "Chrome extension",
	upload: "Uploads",
	other: "Other",
};

const alwaysShown: StatsPlatform[] = ["mac", "browser", "guest", "extension"];

export default async function AdminStatsPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const sp = await searchParams;
	const range = parseStatsRange(strParam(sp.range) || undefined);
	const includeInternal = strParam(sp.internal) === "1";
	const s = await adminStats(range, includeInternal);

	const href = (r: StatsRange, internal: boolean) => {
		const q = new URLSearchParams();
		if (r !== "30d") q.set("range", r);
		if (internal) q.set("internal", "1");
		const qs = q.toString();
		return `/dashboard/admin/stats${qs ? `?${qs}` : ""}`;
	};

	const p = s.previous;
	const platformRows = (Object.keys(platformLabels) as StatsPlatform[])
		.filter((k) => alwaysShown.includes(k) || s.platforms[k] > 0)
		.map((k) => ({ label: platformLabels[k], count: s.platforms[k] }));
	const platformTotal = Object.values(s.platforms).reduce((a, b) => a + b, 0);
	const sourceTotal = s.sources.reduce((a, r) => a + r.count, 0);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap gap-3 justify-between items-center">
				<nav aria-label="Time range" className="flex flex-wrap gap-1.5">
					{RANGES.map((r) => (
						<Link
							key={r.value}
							href={href(r.value, includeInternal)}
							aria-current={r.value === s.range ? "page" : undefined}
							className={`px-3 py-1.5 text-sm rounded-lg ${
								r.value === s.range
									? "bg-gray-12 text-gray-1 font-medium"
									: "bg-gray-4 text-gray-11 hover:text-gray-12"
							}`}
						>
							{r.label}
						</Link>
					))}
				</nav>
				<Link
					href={href(s.range, !includeInternal)}
					className="flex gap-2 items-center text-sm text-gray-11 hover:text-gray-12"
				>
					<span
						aria-hidden
						className={`flex justify-center items-center size-4 text-[11px] rounded border ${
							includeInternal
								? "bg-gray-12 border-gray-12 text-gray-1"
								: "border-gray-6"
						}`}
					>
						{includeInternal ? "✓" : ""}
					</span>
					Include our own accounts ({formatNumber(s.internalAccounts)})
				</Link>
			</div>

			<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
				<Headline
					label="Sign-ups"
					value={s.totals.signups}
					before={p?.signups}
				/>
				<Headline
					label="Recordings made"
					value={s.totals.recordings}
					before={p?.recordings}
				/>
				<Headline
					label="Recordings shared"
					value={s.totals.shared}
					before={p?.shared}
					hint="Opened by someone other than the owner"
				/>
				<Headline label="Views" value={s.totals.views} before={p?.views} />
				<Headline
					label="Unique viewers"
					value={s.totals.viewers}
					before={p?.viewers}
				/>
			</div>

			<Card className="space-y-3">
				<CardTitle>Per day</CardTitle>
				<DailyChart data={s.daily} />
			</Card>

			<div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
				<Card className="space-y-4">
					<div className="space-y-1">
						<CardTitle>Activation funnel</CardTitle>
						<CardDescription>
							People who signed up in this period, and how far they got.
						</CardDescription>
					</div>
					{s.funnel.signedUp === 0 ? (
						<EmptyState>No sign-ups in this period.</EmptyState>
					) : (
						<Bars
							of={s.funnel.signedUp}
							rows={[
								{ label: "Signed up", count: s.funnel.signedUp },
								{ label: "Made a recording", count: s.funnel.recorded },
								{ label: "Recording shared", count: s.funnel.shared },
							]}
						/>
					)}
				</Card>

				<Card className="space-y-4">
					<div className="space-y-1">
						<CardTitle>Recordings by platform</CardTitle>
						<CardDescription>
							Recordings made in this period, by where they were made.
						</CardDescription>
					</div>
					{platformTotal === 0 ? (
						<EmptyState>No recordings in this period.</EmptyState>
					) : (
						<Bars of={platformTotal} rows={platformRows} />
					)}
				</Card>
			</div>

			<Card className="space-y-4">
				<div className="space-y-1">
					<CardTitle>Recording without an account</CardTitle>
					<CardDescription>
						People who started a recording on /record in this period, and how
						far they got. Signing up is entering the emailed code.
					</CardDescription>
				</div>
				{s.guest.started === 0 ? (
					<EmptyState>
						{s.guestSince
							? "Nobody recorded without an account in this period."
							: "Counting starts with the first recording on /record."}
					</EmptyState>
				) : (
					<div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
						<Bars
							of={s.guest.started}
							rows={[
								{ label: "Started recording", count: s.guest.started },
								{ label: "Finished recording", count: s.guest.stopped },
								{ label: "Entered their email", count: s.guest.emailed },
								{
									label: "Signed up (entered the code)",
									count: s.guest.verified,
								},
								{ label: "Got their link", count: s.guest.uploaded },
							]}
						/>
						<dl className="grid gap-3 content-start text-sm">
							{[
								{
									label: "Left without signing up",
									value: s.guest.leftWithoutSigningUp,
									hint: "Finished a recording, never entered the code",
								},
								{
									label: "Downloaded instead",
									value: s.guest.downloaded,
								},
								{
									label: "Blocked from signing up",
									value: s.guest.blocked,
								},
							].map((d) => (
								<div
									key={d.label}
									className="rounded-lg border border-gray-4 bg-gray-2 px-3 py-2"
								>
									<dt className="text-gray-10">{d.label}</dt>
									<dd className="text-lg font-medium text-gray-12">
										{formatNumber(d.value)}
										{s.guest.stopped > 0 && (
											<span className="ml-1 text-xs font-normal text-gray-10">
												{Math.round((d.value / s.guest.stopped) * 100)}% of
												finished
											</span>
										)}
									</dd>
									{d.hint && <p className="text-xs text-gray-10">{d.hint}</p>}
								</div>
							))}
						</dl>
					</div>
				)}
			</Card>

			<Card className="space-y-4">
				<div className="space-y-1">
					<CardTitle>Sign-up sources</CardTitle>
					<CardDescription>Where new accounts came from.</CardDescription>
				</div>
				{s.sources.length === 0 ? (
					<EmptyState>No sign-ups in this period.</EmptyState>
				) : (
					<div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
						<table className="w-full text-sm self-start">
							<thead>
								<tr className="text-left text-xs text-gray-10">
									<th className="pb-2 font-normal">Source</th>
									<th className="pb-2 font-normal text-right">Sign-ups</th>
									<th className="pb-2 font-normal text-right">Share</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-4">
								{s.sources.map((r) => (
									<tr key={r.label}>
										<td className="py-2 text-gray-12">{r.label}</td>
										<td className="py-2 text-right tabular-nums text-gray-11">
											{formatNumber(r.count)}
										</td>
										<td className="py-2 text-right tabular-nums text-gray-10">
											{percent(r.count, sourceTotal)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
						<SourcesChart data={s.sourcesDaily} />
					</div>
				)}
			</Card>

			<p className="text-xs text-gray-10">
				Views are counted from {longDay(s.viewsSince)}; sign-up sources from{" "}
				{longDay(s.sourcesSince)}. Viewers without a session count as one.
			</p>
		</div>
	);
}

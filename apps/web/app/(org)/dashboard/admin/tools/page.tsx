import { Card, CardDescription, CardTitle } from "@cap/ui";
import Link from "next/link";
import {
	parseToolRange,
	TOOL_RANGES,
	type ToolDay,
	type ToolsReport,
	toolsReport,
} from "@/lib/screencap-admin";
import { TOOL_LABELS, TOOL_SLUGS, type ToolSlug } from "@/lib/tool-events";
import { EmptyState, formatNumber, strParam } from "../_components/format";

export const dynamic = "force-dynamic";

const pct = (n: number, of: number) =>
	of > 0 ? `${((n / of) * 100).toFixed(of > 0 && n / of < 0.1 ? 1 : 0)}%` : "-";

const vizStyles = `
.tools-viz{--views:#2a78d6;--conv:#eb6834;--f1:#86b6ef;--f2:#6da7ec;--f3:#5598e7;--f4:#3987e5;--f5:#2a78d6;--f6:#1c5cab}
@media (prefers-color-scheme: dark){:root:where(:not([data-theme="light"])) .tools-viz{--views:#3987e5;--conv:#d95926}}
:root[data-theme="dark"] .tools-viz{--views:#3987e5;--conv:#d95926}
`;

function RangeSwitch({ range }: { range: number }) {
	return (
		<fieldset className="flex gap-1 p-0 m-0 border-0" aria-label="Date range">
			{TOOL_RANGES.map((r) => (
				<Link
					key={r}
					href={`/dashboard/admin/tools?range=${r}`}
					aria-current={r === range ? "true" : undefined}
					className={`px-3 py-1.5 text-sm rounded-lg border ${
						r === range
							? "border-gray-12 text-gray-12 font-medium"
							: "border-gray-4 text-gray-10 hover:text-gray-12"
					}`}
				>
					{r} days
				</Link>
			))}
		</fieldset>
	);
}

const COLS: { key: string; label: string }[] = [
	{ key: "views", label: "Views" },
	{ key: "filesPicked", label: "Files picked" },
	{ key: "convertOk", label: "Converted" },
	{ key: "fail", label: "Failure rate" },
	{ key: "downloaded", label: "Downloads" },
	{ key: "promptShown", label: "Prompt shown" },
	{ key: "ctaSignup", label: "Sign-up clicks" },
	{ key: "ctaDownload", label: "Download clicks" },
	{ key: "signedUp", label: "Sign-ups" },
];

function SummaryTable({ report }: { report: ToolsReport }) {
	return (
		<Card className="space-y-3">
			<div className="space-y-1">
				<CardTitle>Per tool</CardTitle>
				<CardDescription>
					Views count distinct page visits. The other columns count events.
				</CardDescription>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full text-sm text-left">
					<thead>
						<tr className="border-b border-gray-4 text-gray-10">
							<th className="py-2 pr-3 font-medium">Tool</th>
							{COLS.map((c) => (
								<th key={c.key} className="px-3 py-2 font-medium text-right">
									{c.label}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-4 text-gray-12">
						{report.tools.map((x) => (
							<tr key={x.tool}>
								<td className="py-2 pr-3 whitespace-nowrap">
									{TOOL_LABELS[x.tool]}
								</td>
								<Td v={x.views} />
								<Td v={x.filesPicked} />
								<Td v={x.convertOk} />
								<td className="px-3 py-2 text-right tabular-nums">
									{pct(x.convertFailed, x.convertOk + x.convertFailed)}
								</td>
								<Td v={x.downloaded} />
								<Td v={x.promptShown} />
								<Td v={x.ctaSignup} />
								<Td v={x.ctaDownload} />
								<Td v={x.signedUp} />
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Card>
	);
}

function Td({ v }: { v: number }) {
	return (
		<td className="px-3 py-2 text-right tabular-nums">{formatNumber(v)}</td>
	);
}

const FUNNEL = [
	{ key: "views", label: "Viewed" },
	{ key: "filePicked", label: "Picked a file" },
	{ key: "converted", label: "Converted" },
	{ key: "downloaded", label: "Downloaded" },
	{ key: "ctaClick", label: "Clicked a CTA" },
	{ key: "signedUp", label: "Signed up" },
] as const;

function Funnels({ report }: { report: ToolsReport }) {
	return (
		<Card className="space-y-4">
			<div className="space-y-1">
				<CardTitle>Funnel</CardTitle>
				<CardDescription>
					Distinct page visits at each step, as a share of views. Sign-ups are
					accounts created after a tool visit.
				</CardDescription>
			</div>
			<div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
				{report.tools.map((x) => {
					const top = Math.max(x.funnel.views, 1);
					return (
						<div key={x.tool} className="space-y-2">
							<h3 className="text-sm font-medium text-gray-12">
								{TOOL_LABELS[x.tool]}
							</h3>
							{FUNNEL.map((f, i) => {
								const v = x.funnel[f.key];
								return (
									<div
										key={f.key}
										className="grid items-center gap-2 text-xs grid-cols-[110px_1fr_90px]"
									>
										<span className="text-gray-11">{f.label}</span>
										<div className="h-3">
											<div
												className="h-3 rounded-r-[4px]"
												style={{
													width: `${Math.max((v / top) * 100, v > 0 ? 1 : 0)}%`,
													background: `var(--f${i + 1})`,
												}}
												title={`${f.label}: ${formatNumber(v)}`}
											/>
										</div>
										<span className="tabular-nums text-gray-12">
											{formatNumber(v)}{" "}
											<span className="text-gray-10">
												{pct(v, x.funnel.views)}
											</span>
										</span>
									</div>
								);
							})}
						</div>
					);
				})}
			</div>
		</Card>
	);
}

function dayRange(since: Date): string[] {
	const out: string[] = [];
	const end = new Date();
	const cur = new Date(
		Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), since.getUTCDate()),
	);
	while (cur.getTime() <= end.getTime()) {
		out.push(cur.toISOString().slice(0, 10));
		cur.setUTCDate(cur.getUTCDate() + 1);
	}
	return out;
}

const W = 520;
const H = 150;
const PAD = { l: 34, r: 8, t: 8, b: 20 };

function ToolChart({
	tool,
	days,
	rows,
}: {
	tool: ToolSlug;
	days: string[];
	rows: ToolDay[];
}) {
	const byDay = new Map(rows.map((r) => [r.day, r]));
	const series = days.map((d) => ({
		day: d,
		views: byDay.get(d)?.views ?? 0,
		conversions: byDay.get(d)?.conversions ?? 0,
	}));
	const max = Math.max(1, ...series.flatMap((s) => [s.views, s.conversions]));
	const x = (i: number) =>
		PAD.l +
		(days.length === 1 ? 0 : (i / (days.length - 1)) * (W - PAD.l - PAD.r));
	const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
	const path = (k: "views" | "conversions") =>
		series
			.map((s, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(s[k]).toFixed(1)}`)
			.join(" ");
	const step = Math.max(1, Math.ceil(days.length / 6));
	return (
		<div className="space-y-2">
			<h3 className="text-sm font-medium text-gray-12">{TOOL_LABELS[tool]}</h3>
			<svg
				viewBox={`0 0 ${W} ${H}`}
				className="w-full h-auto text-gray-10"
				role="img"
				aria-label={`${TOOL_LABELS[tool]}: daily views and conversions`}
			>
				{[0, 0.5, 1].map((f) => (
					<g key={f}>
						<line
							x1={PAD.l}
							x2={W - PAD.r}
							y1={y(max * f)}
							y2={y(max * f)}
							stroke="currentColor"
							strokeOpacity={0.2}
						/>
						<text
							x={PAD.l - 4}
							y={y(max * f) + 3}
							textAnchor="end"
							fontSize={10}
							fill="currentColor"
						>
							{formatNumber(Math.round(max * f))}
						</text>
					</g>
				))}
				{series.map((s, i) =>
					i % step === 0 ? (
						<text
							key={s.day}
							x={x(i)}
							y={H - 6}
							textAnchor="middle"
							fontSize={10}
							fill="currentColor"
						>
							{s.day.slice(5)}
						</text>
					) : null,
				)}
				<path
					d={path("views")}
					fill="none"
					stroke="var(--views)"
					strokeWidth={2}
				/>
				<path
					d={path("conversions")}
					fill="none"
					stroke="var(--conv)"
					strokeWidth={2}
				/>
				{series.map((s, i) => (
					<rect
						key={s.day}
						x={x(i) - (W - PAD.l - PAD.r) / series.length / 2}
						y={PAD.t}
						width={(W - PAD.l - PAD.r) / series.length}
						height={H - PAD.t - PAD.b}
						fill="transparent"
					>
						<title>{`${s.day}: ${s.views} views, ${s.conversions} conversions`}</title>
					</rect>
				))}
			</svg>
		</div>
	);
}

function DailyCharts({ report }: { report: ToolsReport }) {
	const days = dayRange(report.since);
	return (
		<Card className="space-y-4">
			<div className="space-y-1">
				<CardTitle>Daily views and conversions</CardTitle>
				<div className="flex gap-4 text-xs text-gray-11">
					<span className="flex gap-1.5 items-center">
						<span
							className="inline-block w-3 h-0.5"
							style={{ background: "var(--views)" }}
						/>
						Views
					</span>
					<span className="flex gap-1.5 items-center">
						<span
							className="inline-block w-3 h-0.5"
							style={{ background: "var(--conv)" }}
						/>
						Conversions
					</span>
				</div>
			</div>
			<div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
				{TOOL_SLUGS.map((tool) => (
					<ToolChart
						key={tool}
						tool={tool}
						days={days}
						rows={report.daily.filter((r) => r.tool === tool)}
					/>
				))}
			</div>
			<details className="text-xs text-gray-11">
				<summary className="cursor-pointer">Show as table</summary>
				<div className="overflow-x-auto mt-2 max-h-80">
					<table className="w-full text-left">
						<thead>
							<tr className="text-gray-10">
								<th className="py-1 pr-3 font-medium">Day</th>
								<th className="py-1 pr-3 font-medium">Tool</th>
								<th className="py-1 pr-3 font-medium text-right">Views</th>
								<th className="py-1 font-medium text-right">Conversions</th>
							</tr>
						</thead>
						<tbody>
							{[...report.daily]
								.sort((a, b) => b.day.localeCompare(a.day))
								.map((r) => (
									<tr key={`${r.day}-${r.tool}`}>
										<td className="py-1 pr-3">{r.day}</td>
										<td className="py-1 pr-3">{TOOL_LABELS[r.tool]}</td>
										<td className="py-1 pr-3 text-right tabular-nums">
											{formatNumber(r.views)}
										</td>
										<td className="py-1 text-right tabular-nums">
											{formatNumber(r.conversions)}
										</td>
									</tr>
								))}
						</tbody>
					</table>
				</div>
			</details>
		</Card>
	);
}

function BarList({
	title,
	description,
	rows,
	unit,
}: {
	title: string;
	description?: string;
	rows: { label: string; value: number; note?: string }[];
	unit: string;
}) {
	const max = Math.max(1, ...rows.map((r) => r.value));
	return (
		<Card className="space-y-3">
			<div className="space-y-1">
				<CardTitle>{title}</CardTitle>
				{description && <CardDescription>{description}</CardDescription>}
			</div>
			{rows.length === 0 ? (
				<p className="text-sm text-gray-10">Nothing yet.</p>
			) : (
				<ul className="space-y-1.5">
					{rows.map((r) => (
						<li
							key={r.label}
							className="grid items-center gap-2 text-xs grid-cols-[minmax(0,40%)_1fr_auto]"
						>
							<span className="truncate text-gray-11" title={r.label}>
								{r.label}
							</span>
							<div className="h-3">
								<div
									className="h-3 rounded-r-[4px]"
									style={{
										width: `${Math.max((r.value / max) * 100, 1)}%`,
										background: "var(--views)",
									}}
									title={`${r.label}: ${formatNumber(r.value)} ${unit}`}
								/>
							</div>
							<span className="tabular-nums text-gray-12">
								{formatNumber(r.value)}
								{r.note && <span className="text-gray-10"> {r.note}</span>}
							</span>
						</li>
					))}
				</ul>
			)}
		</Card>
	);
}

export default async function AdminToolsPage(props: {
	searchParams: Promise<{ range?: string | string[] }>;
}) {
	const sp = await props.searchParams;
	const range = parseToolRange(strParam(sp.range));
	const report = await toolsReport(range);
	const empty = report.tools.every(
		(x) => x.views === 0 && x.convertOk === 0 && x.signedUp === 0,
	);
	return (
		<div className="flex flex-col gap-6 tools-viz">
			<style>{vizStyles}</style>
			<div className="flex flex-wrap gap-3 justify-between items-center">
				<p className="text-sm text-gray-10">
					Free browser tools at /tools. Events are kept for 90 days.
				</p>
				<RangeSwitch range={range} />
			</div>
			{empty ? (
				<EmptyState>No tool events in the last {range} days yet.</EmptyState>
			) : (
				<>
					<SummaryTable report={report} />
					<Funnels report={report} />
					<DailyCharts report={report} />
					<div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
						<BarList
							title="Failures by browser"
							description="Failed conversions, with the failure rate."
							unit="failures"
							rows={report.failuresByBrowser
								.filter((r) => r.failed > 0)
								.map((r) => ({
									label: r.browser,
									value: r.failed,
									note: pct(r.failed, r.failed + r.ok),
								}))}
						/>
						<BarList
							title="Failures by error"
							unit="failures"
							rows={report.failuresByError.map((r) => ({
								label: `${TOOL_LABELS[r.tool]}: ${r.errorClass}`,
								value: r.failed,
							}))}
						/>
						<BarList
							title="Top referrers"
							description="Distinct visits."
							unit="visits"
							rows={report.referrers.map((r) => ({
								label: r.label,
								value: r.views,
							}))}
						/>
						<BarList
							title="Top countries"
							description="Distinct visits."
							unit="visits"
							rows={report.countries.map((r) => ({
								label: r.label,
								value: r.views,
							}))}
						/>
						<BarList
							title="File sizes"
							description="Files picked, by size."
							unit="files"
							rows={report.fileSizes.map((r) => ({
								label: r.label,
								value: r.files,
							}))}
						/>
					</div>
				</>
			)}
		</div>
	);
}

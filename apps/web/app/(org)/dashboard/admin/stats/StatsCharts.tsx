"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";

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

/** "2026-10-28" to "28 Oct". Done by hand so the viewer's timezone cannot shift the day. */
function shortDay(day: string): string {
	const [, m, d] = day.split("-");
	return `${Number(d)} ${MONTHS[Number(m) - 1] ?? ""}`;
}

const METRICS = [
	{ key: "signups", label: "Sign-ups", color: "#3b82f6" },
	{ key: "recordings", label: "Recordings made", color: "var(--gray-12)" },
	{ key: "shared", label: "Recordings shared", color: "#22c55e" },
	{ key: "views", label: "Views", color: "#f97316" },
	{ key: "viewers", label: "Unique viewers", color: "#ec4899" },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

type DayPoint = { day: string } & Record<MetricKey, number>;

const SOURCE_COLORS = [
	"#3b82f6",
	"#22c55e",
	"#f97316",
	"#ec4899",
	"#a855f7",
	"#9ca3af",
];

function EmptyChart({ children }: { children: string }) {
	return (
		<div className="flex h-[220px] w-full items-center justify-center rounded-xl border border-dashed border-gray-5 text-sm text-gray-9">
			{children}
		</div>
	);
}

function ticksFor(max: number): number[] {
	const top = Math.max(1, max);
	const step = Math.max(1, Math.ceil(top / 4));
	const out: number[] = [];
	for (let v = 0; v <= top + step - 1; v += step) out.push(v);
	return out;
}

export function DailyChart({ data }: { data: DayPoint[] }) {
	const [metric, setMetric] = useState<MetricKey>("signups");
	const m = METRICS.find((x) => x.key === metric) ?? METRICS[0];
	const config = {
		[m.key]: { label: m.label, color: m.color },
	} satisfies ChartConfig;
	const rows = data.map((d) => ({ ...d, label: shortDay(d.day) }));
	const max = Math.max(0, ...rows.map((r) => r[m.key]));
	const ticks = ticksFor(max);
	return (
		<div className="space-y-3">
			<div className="flex flex-wrap gap-1.5">
				{METRICS.map((x) => (
					<button
						key={x.key}
						type="button"
						aria-pressed={x.key === metric}
						onClick={() => setMetric(x.key)}
						className={`px-2.5 py-1 text-xs rounded-md ${
							x.key === metric
								? "bg-gray-12 text-gray-1 font-medium"
								: "bg-gray-4 text-gray-11 hover:text-gray-12"
						}`}
					>
						{x.label}
					</button>
				))}
			</div>
			{max === 0 ? (
				<EmptyChart>{`No ${m.label.toLowerCase()} in this period.`}</EmptyChart>
			) : (
				<ChartContainer className="h-[220px] w-full" config={config}>
					<BarChart
						accessibilityLayer
						data={rows}
						margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
					>
						<CartesianGrid
							vertical={false}
							strokeDasharray="3 3"
							stroke="var(--gray-8)"
							opacity={0.3}
						/>
						<XAxis
							dataKey="label"
							axisLine={false}
							tickLine={false}
							tickMargin={8}
							minTickGap={24}
							tick={{ fontSize: 11 }}
						/>
						<YAxis
							axisLine={false}
							tickLine={false}
							allowDecimals={false}
							ticks={ticks}
							domain={[0, ticks[ticks.length - 1] ?? 1]}
							width={28}
							tick={{ fontSize: 11 }}
						/>
						<ChartTooltip content={<ChartTooltipContent />} />
						<Bar
							dataKey={m.key}
							fill={m.color}
							radius={[3, 3, 0, 0]}
							maxBarSize={28}
						/>
					</BarChart>
				</ChartContainer>
			)}
		</div>
	);
}

export function SourcesChart({
	data,
}: {
	data: { day: string; counts: Record<string, number> }[];
}) {
	const labels: string[] = [];
	for (const d of data)
		for (const k of Object.keys(d.counts))
			if (!labels.includes(k)) labels.push(k);
	// "Other" always last so it takes the grey slot.
	labels.sort((a, b) => Number(a === "Other") - Number(b === "Other"));
	const rows = data.map((d) => ({
		label: shortDay(d.day),
		...Object.fromEntries(labels.map((l) => [l, d.counts[l] ?? 0])),
	}));
	const colorOf = (l: string, i: number) =>
		l === "Other"
			? (SOURCE_COLORS[SOURCE_COLORS.length - 1] as string)
			: (SOURCE_COLORS[i % (SOURCE_COLORS.length - 1)] as string);
	const config: ChartConfig = Object.fromEntries(
		labels.map((l, i) => [l, { label: l, color: colorOf(l, i) }]),
	);
	const max = Math.max(
		0,
		...data.map((d) => Object.values(d.counts).reduce((a, b) => a + b, 0)),
	);
	if (max === 0) return <EmptyChart>No sign-ups in this period.</EmptyChart>;
	const ticks = ticksFor(max);
	return (
		<div className="space-y-3">
			<ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-11">
				{labels.map((l, i) => (
					<li key={l} className="flex gap-1.5 items-center">
						<span
							className="inline-block size-2.5 rounded-sm"
							style={{ background: colorOf(l, i) }}
						/>
						{l}
					</li>
				))}
			</ul>
			<ChartContainer className="h-[220px] w-full" config={config}>
				<BarChart
					accessibilityLayer
					data={rows}
					margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
				>
					<CartesianGrid
						vertical={false}
						strokeDasharray="3 3"
						stroke="var(--gray-8)"
						opacity={0.3}
					/>
					<XAxis
						dataKey="label"
						axisLine={false}
						tickLine={false}
						tickMargin={8}
						minTickGap={24}
						tick={{ fontSize: 11 }}
					/>
					<YAxis
						axisLine={false}
						tickLine={false}
						allowDecimals={false}
						ticks={ticks}
						domain={[0, ticks[ticks.length - 1] ?? 1]}
						width={28}
						tick={{ fontSize: 11 }}
					/>
					<ChartTooltip content={<ChartTooltipContent />} />
					{labels.map((l, i) => (
						<Bar
							key={l}
							dataKey={l}
							stackId="a"
							fill={colorOf(l, i)}
							maxBarSize={28}
						/>
					))}
				</BarChart>
			</ChartContainer>
		</div>
	);
}

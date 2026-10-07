import type { ReactNode } from "react";

export function formatDuration(seconds: number | null | undefined): string {
	const s = Math.max(0, Math.round(seconds ?? 0));
	if (s < 60) return s === 0 ? "0 min" : "under 1 min";
	const totalMin = Math.floor(s / 60);
	const h = Math.floor(totalMin / 60);
	const m = totalMin % 60;
	if (h === 0) return `${m} min`;
	return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatNumber(n: number | null | undefined): string {
	return new Intl.NumberFormat("en-GB").format(n ?? 0);
}

export function absoluteDate(d: Date | string | number): string {
	const date = new Date(d);
	return `${date.toLocaleString("en-GB", {
		timeZone: "UTC",
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})} UTC`;
}

export function relativeDate(d: Date | string | number, now = Date.now()) {
	const diff = new Date(d).getTime() - now;
	const abs = Math.abs(diff);
	const units: [number, string][] = [
		[86_400_000 * 365, "year"],
		[86_400_000 * 30, "month"],
		[86_400_000 * 7, "week"],
		[86_400_000, "day"],
		[3_600_000, "hour"],
		[60_000, "minute"],
	];
	for (const [ms, name] of units) {
		if (abs >= ms) {
			const n = Math.floor(abs / ms);
			const label = `${n} ${name}${n === 1 ? "" : "s"}`;
			return diff < 0 ? `${label} ago` : `in ${label}`;
		}
	}
	return "just now";
}

export function DateText({
	value,
	empty = "Never",
}: {
	value: Date | string | number | null | undefined;
	empty?: string;
}) {
	if (!value) return <span className="text-gray-10">{empty}</span>;
	return (
		<span title={absoluteDate(value)} suppressHydrationWarning>
			{relativeDate(value)}
		</span>
	);
}

const chipTones = {
	gray: "bg-gray-4 text-gray-11",
	green: "bg-green-500/10 text-green-600",
	red: "bg-red-500/10 text-red-600",
	amber: "bg-amber-500/10 text-amber-600",
	blue: "bg-blue-500/10 text-blue-600",
} as const;

export function Chip({
	children,
	tone = "gray",
}: {
	children: ReactNode;
	tone?: keyof typeof chipTones;
}) {
	return (
		<span
			className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md whitespace-nowrap ${chipTones[tone]}`}
		>
			{children}
		</span>
	);
}

export function EmptyState({ children }: { children: ReactNode }) {
	return (
		<div className="px-4 py-10 text-sm text-center rounded-xl border border-gray-4 bg-gray-2 text-gray-10">
			{children}
		</div>
	);
}

export function pageParam(v: string | string[] | undefined): number {
	const n = Number(Array.isArray(v) ? v[0] : v);
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

export function strParam(v: string | string[] | undefined): string {
	return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

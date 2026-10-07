import Link from "next/link";
import { listReports } from "@/lib/screencap-admin";
import { Chip, DateText, EmptyState, strParam } from "../_components/format";
import { ReportActions } from "./ReportActions";

export const dynamic = "force-dynamic";

const FILTERS = [
	{ value: "open", label: "Open" },
	{ value: "actioned", label: "Actioned" },
	{ value: "dismissed", label: "Dismissed" },
	{ value: "all", label: "All" },
] as const;

const REASONS: Record<string, string> = {
	illegal: "Illegal content",
	copyright: "Copyright infringement",
	harassment: "Harassment or hate",
	spam: "Spam or scam",
	other: "Other",
};

export default async function AdminReportsPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const sp = await searchParams;
	const raw = strParam(sp.status);
	const status = FILTERS.some((f) => f.value === raw)
		? (raw as (typeof FILTERS)[number]["value"])
		: "open";
	const reports = await listReports({ status, limit: 100 });

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap gap-2">
				{FILTERS.map((f) => (
					<Link
						key={f.value}
						href={`/dashboard/admin/reports?status=${f.value}`}
						className={`px-3 py-1.5 text-sm rounded-full border ${
							status === f.value
								? "bg-gray-12 text-gray-1 border-gray-12"
								: "border-gray-4 text-gray-11 hover:bg-gray-3"
						}`}
					>
						{f.label}
					</Link>
				))}
			</div>
			{reports.length === 0 ? (
				<EmptyState>
					{status === "open"
						? "No open reports. Nothing needs a decision."
						: "No reports in this view."}
				</EmptyState>
			) : (
				<ul className="flex flex-col gap-4">
					{reports.map((r) => (
						<li
							key={r.id}
							className="flex flex-col gap-3 p-4 text-sm rounded-xl border border-gray-4 bg-gray-2"
						>
							<div className="space-y-1">
								<div className="flex flex-wrap gap-2 items-center">
									<span className="font-medium text-gray-12 break-words">
										{r.videoTitle || "(untitled)"}
									</span>
									<Chip tone="amber">{REASONS[r.reason] ?? r.reason}</Chip>
									<Chip
										tone={
											r.status === "open"
												? "red"
												: r.status === "actioned"
													? "green"
													: "gray"
										}
									>
										{r.status === "open"
											? "Open"
											: r.status === "actioned"
												? "Actioned"
												: "Dismissed"}
									</Chip>
									{r.recordingRemoved && <Chip>Recording removed</Chip>}
									{r.e2ee && <Chip tone="blue">E2EE</Chip>}
									{r.e2ee && (
										<Chip tone={r.keyIncluded ? "green" : "gray"}>
											Key included: {r.keyIncluded ? "yes" : "no"}
										</Chip>
									)}
								</div>
								<p className="text-xs text-gray-10 break-all">
									<span className="font-mono">{r.videoId}</span>
									{" · owner "}
									{r.ownerEmail ?? "unknown"}
									{" · reported "}
									<DateText value={r.createdAt} />
									{r.country ? ` from ${r.country}` : ""}
									{r.reporterEmail ? ` by ${r.reporterEmail}` : " anonymously"}
								</p>
							</div>
							{r.details && (
								<p className="p-3 whitespace-pre-wrap break-words rounded-lg bg-gray-3 text-gray-12">
									{r.details}
								</p>
							)}
							{r.status === "open" ? (
								<ReportActions
									reportId={r.id}
									videoId={r.videoId}
									title={r.videoTitle}
									ownerId={r.ownerId}
									ownerEmail={r.ownerEmail}
									recordingRemoved={r.recordingRemoved}
									e2ee={r.e2ee}
									keyIncluded={r.keyIncluded}
								/>
							) : (
								<p className="text-xs text-gray-10">
									Closed by {r.resolvedBy ?? "an admin"}{" "}
									<DateText value={r.resolvedAt} />
									{r.adminNote ? `: ${r.adminNote}` : ""}
								</p>
							)}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

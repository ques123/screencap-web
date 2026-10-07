import { listRecordings } from "@/lib/screencap-admin";
import {
	Chip,
	DateText,
	EmptyState,
	formatDuration,
	formatNumber,
	pageParam,
	strParam,
} from "../_components/format";
import { Pager, SearchBar } from "../_components/Pager";
import { RecordingActions } from "../_components/RecordingActions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function AdminRecordingsPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const sp = await searchParams;
	const q = strParam(sp.q);
	const page = pageParam(sp.page);
	const { rows, total } = await listRecordings({
		q: q || undefined,
		limit: PAGE_SIZE,
		offset: (page - 1) * PAGE_SIZE,
	});

	return (
		<div className="flex flex-col gap-4">
			<SearchBar
				action="/dashboard/admin/recordings"
				q={q}
				placeholder="Search by title, recording id or owner email"
			/>
			{rows.length === 0 ? (
				<EmptyState>
					{q ? `No recordings match "${q}".` : "No recordings yet."}
				</EmptyState>
			) : (
				<ul className="rounded-xl border border-gray-4 bg-gray-2 divide-y divide-gray-4">
					{rows.map((r) => (
						<li key={r.id} className="flex flex-col gap-3 px-4 py-3 text-sm">
							<div className="flex flex-col gap-1 min-w-0">
								<div className="flex flex-wrap gap-2 items-center">
									<span className="font-medium text-gray-12 break-words">
										{r.title || "(untitled)"}
									</span>
									{r.e2ee && <Chip tone="blue">E2EE</Chip>}
									<Chip tone={r.public ? "blue" : "gray"}>
										{r.public ? "Public" : "Private"}
									</Chip>
									{r.openReports > 0 && (
										<Chip tone="red">
											{r.openReports} open report
											{r.openReports === 1 ? "" : "s"}
										</Chip>
									)}
								</div>
								<p className="text-xs text-gray-10 break-all">
									<span className="font-mono">{r.id}</span>
									{" · "}
									{r.ownerEmail ?? "unknown owner"}
								</p>
								<p className="text-xs text-gray-10">
									{formatDuration(r.durationSeconds)} · {formatNumber(r.views)}{" "}
									view{r.views === 1 ? "" : "s"} ·{" "}
									<DateText value={r.createdAt} />
								</p>
							</div>
							<RecordingActions
								videoId={r.id}
								title={r.title}
								isPublic={r.public}
								ownerEmail={r.ownerEmail}
								e2ee={r.e2ee}
								hasReporterKey={r.hasReporterKey}
							/>
						</li>
					))}
				</ul>
			)}
			<Pager
				basePath="/dashboard/admin/recordings"
				params={q ? { q } : {}}
				page={page}
				pageSize={PAGE_SIZE}
				total={total}
			/>
		</div>
	);
}

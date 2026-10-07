import { listRemoved } from "@/lib/screencap-admin";
import { Chip, DateText, EmptyState } from "../_components/format";
import {
	PurgeDueButton,
	QuarantineRemovedButton,
	RestoreButton,
} from "./RemovedActions";

export const dynamic = "force-dynamic";

export default async function AdminRemovedPage() {
	const rows = await listRemoved({ states: ["removed", "quarantined"] });
	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-sm text-gray-11">
					Removed recordings can be restored for 7 days. After that the files
					are deleted by the daily purge. Quarantined recordings are kept until
					you decide otherwise and cannot be purged here.
				</p>
				<PurgeDueButton />
			</div>
			{rows.length === 0 ? (
				<EmptyState>Nothing is waiting. No recordings are removed.</EmptyState>
			) : (
				<ul className="rounded-xl border border-gray-4 bg-gray-2 divide-y divide-gray-4">
					{rows.map((r) => (
						<li
							key={r.videoId}
							className="flex flex-col gap-3 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between"
						>
							<div className="space-y-1 min-w-0">
								<div className="flex flex-wrap gap-2 items-center">
									<span className="font-medium text-gray-12 break-words">
										{r.title || "(untitled)"}
									</span>
									{r.state === "quarantined" ? (
										<Chip tone="red">Quarantined</Chip>
									) : (
										<Chip tone="amber">
											{r.daysLeft === null
												? "Removed"
												: r.daysLeft <= 0
													? "Due for purge"
													: `${r.daysLeft} day${r.daysLeft === 1 ? "" : "s"} left`}
										</Chip>
									)}
									<Chip>
										{r.source === "report" ? "From a report" : "We found it"}
									</Chip>
								</div>
								<p className="text-xs text-gray-10 break-all">
									<span className="font-mono">{r.videoId}</span>
									{" · "}
									{r.ownerEmail ?? "unknown owner"}
									{" · removed "}
									<DateText value={r.removedAt} /> by {r.removedBy}
								</p>
								{r.reason && (
									<p className="text-xs text-gray-11 break-words">
										Reason: {r.reason}
									</p>
								)}
							</div>
							<div className="flex flex-wrap gap-2 shrink-0">
								<RestoreButton
									videoId={r.videoId}
									title={r.title}
									quarantined={r.state === "quarantined"}
								/>
								{r.state === "removed" && (
									<QuarantineRemovedButton
										videoId={r.videoId}
										title={r.title}
									/>
								)}
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

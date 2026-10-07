"use client";

import { Button } from "@cap/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog, NcmecSteps } from "../_components/ConfirmDialog";
import { OpenWithKeyForm } from "../_components/OpenWithKeyForm";
import {
	blockFromReportAction,
	dismissReportAction,
	removeFromReportAction,
} from "../actions";

export function ReportActions({
	reportId,
	videoId,
	title,
	ownerId,
	ownerEmail,
	recordingRemoved,
	e2ee = false,
	keyIncluded = false,
}: {
	reportId: number;
	videoId: string;
	title: string | null;
	ownerId: string | null;
	ownerEmail: string | null;
	recordingRemoved: boolean;
	e2ee?: boolean;
	keyIncluded?: boolean;
}) {
	const router = useRouter();
	const [pending, start] = useTransition();
	const [note, setNote] = useState("");
	const label = title || "(untitled)";

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap gap-2 items-center">
				<Button
					href={`/s/${videoId}`}
					target="_blank"
					size="xs"
					variant="outline"
				>
					Open recording
				</Button>
				{e2ee && keyIncluded && (
					<OpenWithKeyForm videoId={videoId} reportId={reportId} />
				)}
				{!recordingRemoved && (
					<>
						<ConfirmDialog
							triggerLabel="Remove recording"
							title="Remove the reported recording?"
							description={`"${label}" disappears everywhere. You can undo this for 7 days on the Removed page. The report is marked as actioned.`}
							confirmLabel="Remove recording"
							expected={videoId}
							expectedLabel="the recording id"
							reasonRequired
							askSource={false}
							askNotify={Boolean(ownerEmail)}
							defaultSource="report"
							onConfirm={(v) => removeFromReportAction(reportId, videoId, v)}
						/>
						<ConfirmDialog
							triggerLabel="Quarantine (CSAM)"
							title="Quarantine the reported recording?"
							description={`"${label}" is removed now and kept as evidence. It is never purged automatically.`}
							confirmLabel="Quarantine and block owner"
							expected={videoId}
							expectedLabel="the recording id"
							reasonRequired
							askSource={false}
							extra={<NcmecSteps />}
							onConfirm={(v) =>
								removeFromReportAction(reportId, videoId, {
									...v,
									notify: false,
									quarantine: true,
								})
							}
						/>
					</>
				)}
				{ownerId && ownerEmail && (
					<ConfirmDialog
						triggerLabel="Block owner"
						title="Block the owner?"
						description={`${ownerEmail} is signed out everywhere, cannot sign in, and all their recordings are made private. The report is marked as actioned.`}
						confirmLabel="Block owner"
						expected={ownerEmail}
						expectedLabel="their email"
						reasonRequired
						askSource={false}
						askNotify
						defaultSource="report"
						onConfirm={(v) => blockFromReportAction(reportId, ownerId, v)}
					/>
				)}
			</div>
			<div className="flex flex-col gap-2 sm:flex-row">
				<input
					value={note}
					onChange={(e) => setNote(e.target.value)}
					placeholder="Note for dismissing (optional)"
					aria-label="Note for dismissing"
					className="flex-1 px-3 h-[32px] min-w-0 text-[16px] md:text-[13px] rounded-xl border bg-gray-1 border-gray-4 text-gray-12 placeholder:text-gray-8 outline-0"
				/>
				<Button
					type="button"
					size="xs"
					variant="gray"
					disabled={pending}
					onClick={() =>
						start(async () => {
							const r = await dismissReportAction(reportId, note);
							if (r.ok) toast.success(r.message);
							else toast.error(r.error);
							router.refresh();
						})
					}
				>
					Dismiss report
				</Button>
			</div>
		</div>
	);
}

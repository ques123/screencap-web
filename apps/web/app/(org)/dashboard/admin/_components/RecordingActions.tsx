"use client";

import { Button } from "@cap/ui";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { removeRecordingAction, setRecordingPublicAction } from "../actions";
import { ConfirmDialog, NcmecSteps } from "./ConfirmDialog";
import { OpenWithKeyForm } from "./OpenWithKeyForm";

export function RecordingActions({
	videoId,
	title,
	isPublic,
	ownerEmail,
	e2ee = false,
	hasReporterKey = false,
}: {
	videoId: string;
	title: string | null;
	isPublic: boolean;
	ownerEmail: string | null;
	e2ee?: boolean;
	hasReporterKey?: boolean;
}) {
	const router = useRouter();
	const [pending, start] = useTransition();
	const label = title || "(untitled)";
	return (
		<div className="flex flex-wrap gap-2 items-center">
			<Button
				href={`/s/${videoId}`}
				target="_blank"
				size="xs"
				variant="outline"
			>
				Open
			</Button>
			{e2ee && hasReporterKey && <OpenWithKeyForm videoId={videoId} />}
			<Button
				type="button"
				size="xs"
				variant="white"
				disabled={pending}
				onClick={() =>
					start(async () => {
						const r = await setRecordingPublicAction(videoId, !isPublic);
						if (r.ok) toast.success(r.message);
						else toast.error(r.error);
						router.refresh();
					})
				}
			>
				{isPublic ? "Make private" : "Make public"}
			</Button>
			<ConfirmDialog
				triggerLabel="Remove"
				title="Remove this recording?"
				description={`"${label}"${ownerEmail ? ` by ${ownerEmail}` : ""} disappears everywhere straight away. You can undo this for 7 days on the Removed page. After that the files are deleted for good.`}
				confirmLabel="Remove recording"
				expected={videoId}
				expectedLabel="the recording id"
				reasonRequired
				askNotify={Boolean(ownerEmail)}
				onConfirm={(v) => removeRecordingAction(videoId, v)}
			/>
			<ConfirmDialog
				triggerLabel="Quarantine (CSAM)"
				title="Quarantine this recording?"
				description={`"${label}" is removed now and kept as evidence. It is never purged automatically.`}
				confirmLabel="Quarantine and block owner"
				expected={videoId}
				expectedLabel="the recording id"
				reasonRequired
				askNotify={false}
				defaultSource="own"
				extra={<NcmecSteps />}
				onConfirm={(v) =>
					removeRecordingAction(videoId, {
						...v,
						notify: false,
						quarantine: true,
					})
				}
			/>
		</div>
	);
}

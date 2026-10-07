"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ConfirmDialog, NcmecSteps } from "../_components/ConfirmDialog";
import {
	purgeDueNowAction,
	removeRecordingAction,
	restoreRecordingAction,
} from "../actions";

export function RestoreButton({
	videoId,
	title,
	quarantined = false,
}: {
	videoId: string;
	title: string | null;
	quarantined?: boolean;
}) {
	if (quarantined)
		return (
			<ConfirmDialog
				triggerLabel="Restore"
				triggerVariant="outline"
				title="Restore quarantined content?"
				description={`"${title || "(untitled)"}" was quarantined as suspected child sexual abuse material. Only restore it if that was a mistake. It comes back private and the owner stays blocked.`}
				confirmLabel="Restore anyway"
				expected={videoId}
				expectedLabel="the recording id"
				askReason={false}
				askSource={false}
				onConfirm={() =>
					restoreRecordingAction(videoId, { force: true, confirm: videoId })
				}
			/>
		);
	return (
		<ConfirmDialog
			triggerLabel="Restore"
			triggerVariant="dark"
			title="Restore this recording?"
			description={`"${title || "(untitled)"}" comes back with the same link. It stays private if the owner is blocked.`}
			confirmLabel="Restore"
			askReason={false}
			askSource={false}
			onConfirm={() => restoreRecordingAction(videoId)}
		/>
	);
}

/** A removed recording that turns out to be CSAM: stop the purge, keep it as evidence, block the owner. */
export function QuarantineRemovedButton({
	videoId,
	title,
}: {
	videoId: string;
	title: string | null;
}) {
	return (
		<ConfirmDialog
			triggerLabel="Quarantine (CSAM)"
			triggerVariant="outline"
			title="Quarantine this removed recording?"
			description={`"${title || "(untitled)"}" is kept as evidence and never purged automatically.`}
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
	);
}

export function PurgeDueButton() {
	const router = useRouter();
	const [pending, start] = useTransition();
	return (
		<ConfirmDialog
			triggerLabel="Purge expired now"
			triggerVariant="outline"
			triggerSize="sm"
			disabled={pending}
			title="Purge expired recordings?"
			description="Deletes the files of every removed recording whose 7 days are over. This cannot be undone. Quarantined recordings are never touched."
			confirmLabel="Purge expired"
			expected="purge"
			askReason={false}
			askSource={false}
			onConfirm={async () => {
				const r = await purgeDueNowAction();
				start(() => router.refresh());
				return r;
			}}
		/>
	);
}

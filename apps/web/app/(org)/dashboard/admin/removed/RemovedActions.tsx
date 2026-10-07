"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ConfirmDialog } from "../_components/ConfirmDialog";
import { purgeDueNowAction, restoreRecordingAction } from "../actions";

export function RestoreButton({
	videoId,
	title,
}: {
	videoId: string;
	title: string | null;
}) {
	return (
		<ConfirmDialog
			triggerLabel="Restore"
			triggerVariant="dark"
			title="Restore this recording?"
			description={`"${title || "(untitled)"}" comes back exactly as it was, with the same link.`}
			confirmLabel="Restore"
			askReason={false}
			askSource={false}
			onConfirm={() => restoreRecordingAction(videoId)}
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

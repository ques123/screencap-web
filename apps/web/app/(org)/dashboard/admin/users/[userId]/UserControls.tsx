"use client";

import { Button, Card, CardDescription, CardTitle, Input } from "@cap/ui";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import {
	blockUserAction,
	deleteAccountAction,
	setProRevokedAction,
	setUserOverridesAction,
	signOutEverywhereAction,
	unblockUserAction,
} from "../../actions";

function toNumber(v: string): number | null | "bad" {
	const t = v.trim();
	if (!t) return null;
	const n = Number(t);
	return Number.isFinite(n) && n > 0 ? n : "bad";
}

export function UserControls({
	userId,
	email,
	blocked,
	proRevoked,
	storageHoursOverride,
	recordingMinutesOverride,
	note,
	limits,
}: {
	userId: string;
	email: string;
	blocked: boolean;
	proRevoked: boolean;
	storageHoursOverride: number | null;
	recordingMinutesOverride: number | null;
	note: string | null;
	limits: {
		storageHours: number | null;
		recordingMinutes: number | null;
	};
}) {
	const router = useRouter();
	const [pending, start] = useTransition();
	const [storage, setStorage] = useState(
		storageHoursOverride?.toString() ?? "",
	);
	const [minutes, setMinutes] = useState(
		recordingMinutesOverride?.toString() ?? "",
	);
	const [noteText, setNoteText] = useState(note ?? "");
	const storageId = useId();
	const minutesId = useId();
	const noteId = useId();

	const run = (
		fn: () => Promise<{ ok: boolean; message?: string; error?: string }>,
	) =>
		start(async () => {
			try {
				const r = await fn();
				if (r.ok) toast.success(r.message ?? "Done");
				else toast.error(r.error ?? "Failed");
			} catch {
				toast.error("Something went wrong. Nothing was changed.");
			}
			router.refresh();
		});

	const saveOverrides = () => {
		const s = toNumber(storage);
		const m = toNumber(minutes);
		if (s === "bad" || m === "bad") {
			toast.error("Limits must be numbers above 0, or empty.");
			return;
		}
		run(() =>
			setUserOverridesAction(userId, {
				storageHoursOverride: s,
				recordingMinutesOverride: m,
				note: noteText.trim() || null,
			}),
		);
	};

	return (
		<div className="flex flex-col gap-6">
			<Card className="space-y-4">
				<div className="space-y-1">
					<CardTitle>Limits and note</CardTitle>
					<CardDescription>
						Leave a box empty to use the site-wide limit. Right now this user
						can store{" "}
						{limits.storageHours === null
							? "unlimited video"
							: `${limits.storageHours} h of video`}{" "}
						and record up to{" "}
						{limits.recordingMinutes === null
							? "any length"
							: `${limits.recordingMinutes} min`}{" "}
						at a time.
					</CardDescription>
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1">
						<label htmlFor={storageId} className="text-sm text-gray-11">
							Storage limit (hours of video)
						</label>
						<Input
							id={storageId}
							inputMode="decimal"
							placeholder="Site default"
							value={storage}
							onChange={(e) => setStorage(e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<label htmlFor={minutesId} className="text-sm text-gray-11">
							Longest recording (minutes)
						</label>
						<Input
							id={minutesId}
							inputMode="decimal"
							placeholder="Site default"
							value={minutes}
							onChange={(e) => setMinutes(e.target.value)}
						/>
					</div>
				</div>
				<div className="space-y-1">
					<label htmlFor={noteId} className="text-sm text-gray-11">
						Private note (only admins see this)
					</label>
					<textarea
						id={noteId}
						rows={3}
						value={noteText}
						onChange={(e) => setNoteText(e.target.value)}
						className="w-full px-3 py-2 text-[16px] md:text-[13px] rounded-xl border bg-gray-1 border-gray-4 text-gray-12 outline-0 focus:border-gray-6"
					/>
				</div>
				<Button
					type="button"
					size="sm"
					variant="dark"
					disabled={pending}
					spinner={pending}
					onClick={saveOverrides}
				>
					Save limits and note
				</Button>
			</Card>

			<Card className="space-y-4">
				<div className="space-y-1">
					<CardTitle>Pro features</CardTitle>
					<CardDescription>
						Everyone has Pro features by default.{" "}
						{proRevoked
							? "This user's Pro features are switched off."
							: "You can switch them off for this user."}
					</CardDescription>
				</div>
				<div>
					<Button
						type="button"
						size="sm"
						variant={proRevoked ? "dark" : "outline"}
						disabled={pending}
						onClick={() => run(() => setProRevokedAction(userId, !proRevoked))}
					>
						{proRevoked ? "Give Pro back" : "Revoke Pro"}
					</Button>
				</div>
			</Card>

			<Card className="space-y-4 border-red-500/30">
				<div className="space-y-1">
					<CardTitle>Account actions</CardTitle>
					<CardDescription>
						Each of these asks for confirmation and is written to the log.
					</CardDescription>
				</div>
				<div className="flex flex-wrap gap-2">
					{blocked ? (
						<ConfirmDialog
							triggerLabel="Unblock user"
							triggerSize="sm"
							triggerVariant="dark"
							title="Unblock this user?"
							description={`${email} will be able to sign in again. Their recordings stay private until they choose otherwise.`}
							confirmLabel="Unblock"
							askSource={false}
							onConfirm={(v) => unblockUserAction(userId, { reason: v.reason })}
						/>
					) : (
						<ConfirmDialog
							triggerLabel="Block user"
							triggerSize="sm"
							title="Block this user?"
							description={`${email} is signed out everywhere, cannot sign in, and all their recordings are made private.`}
							confirmLabel="Block user"
							expected={email}
							expectedLabel="their email"
							reasonRequired
							askNotify
							onConfirm={(v) => blockUserAction(userId, v)}
						/>
					)}
					<ConfirmDialog
						triggerLabel="Sign out everywhere"
						triggerSize="sm"
						triggerVariant="outline"
						title="Sign out everywhere?"
						description={`${email} is signed out of every device. They can sign in again straight away.`}
						confirmLabel="Sign out"
						askReason={false}
						askSource={false}
						onConfirm={() => signOutEverywhereAction(userId)}
					/>
					<ConfirmDialog
						triggerLabel="Delete account"
						triggerSize="sm"
						title="Delete this account?"
						description={`Every recording of ${email} is removed (undo possible for 7 days) and the account is blocked. The account record itself is kept for now.`}
						confirmLabel="Delete account"
						expected={email}
						expectedLabel="their email"
						reasonRequired
						askNotify
						onConfirm={(v) => deleteAccountAction(userId, v)}
					/>
				</div>
			</Card>
		</div>
	);
}

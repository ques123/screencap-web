"use client";

import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@cap/ui";
import { useRouter } from "next/navigation";
import { type ReactNode, useId, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/screencap-admin/types";

export type ConfirmValues = {
	reason: string;
	source: "report" | "own";
	notify: boolean;
};

const fieldCls =
	"w-full px-3 py-2 text-[16px] md:text-[13px] rounded-xl border bg-gray-1 border-gray-4 text-gray-12 placeholder:text-gray-8 outline-0 focus:border-gray-6";

export function ConfirmDialog({
	triggerLabel,
	triggerVariant = "destructive",
	triggerSize = "xs",
	title,
	description,
	confirmLabel,
	expected,
	expectedLabel,
	reasonRequired = false,
	askReason = true,
	askSource = true,
	askNotify = false,
	notifyLabel = "Email the owner a statement of reasons",
	defaultSource = "own",
	extra,
	disabled,
	onConfirm,
}: {
	triggerLabel: string;
	triggerVariant?: "destructive" | "outline" | "gray" | "white" | "dark";
	triggerSize?: "xs" | "sm";
	title: string;
	description: ReactNode;
	confirmLabel: string;
	/** When set, the admin must type this exact value to enable the button. */
	expected?: string;
	expectedLabel?: string;
	reasonRequired?: boolean;
	askReason?: boolean;
	askSource?: boolean;
	askNotify?: boolean;
	notifyLabel?: string;
	defaultSource?: "report" | "own";
	extra?: ReactNode;
	disabled?: boolean;
	onConfirm: (v: ConfirmValues) => Promise<ActionResult>;
}) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState("");
	const [source, setSource] = useState<"report" | "own">(defaultSource);
	const [notify, setNotify] = useState(true);
	const [typed, setTyped] = useState("");
	const [pending, start] = useTransition();
	const id = useId();

	const typedOk = expected === undefined || typed.trim() === expected;
	const reasonOk = !reasonRequired || reason.trim().length > 0;

	const submit = () => {
		start(async () => {
			try {
				const result = await onConfirm({
					reason: reason.trim(),
					source,
					notify: askNotify && notify && reason.trim().length > 0,
				});
				if (!result.ok) {
					toast.error(result.error);
					return;
				}
				toast.success(
					result.notified
						? `${result.message} The owner was emailed.`
						: result.message,
				);
				setOpen(false);
				setReason("");
				setTyped("");
				router.refresh();
			} catch {
				toast.error("Something went wrong. Nothing was changed.");
			}
		});
	};

	return (
		<>
			<Button
				type="button"
				size={triggerSize}
				variant={triggerVariant}
				disabled={disabled}
				onClick={() => setOpen(true)}
			>
				{triggerLabel}
			</Button>
			<Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
				<DialogContent className="max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
					</DialogHeader>
					<DialogDescription className="space-y-3">
						{description}
					</DialogDescription>
					<div className="px-5 pb-5 space-y-4">
						{extra}
						{askReason && (
							<div className="space-y-1">
								<label
									htmlFor={`${id}-reason`}
									className="text-sm font-medium text-gray-12"
								>
									Reason{reasonRequired ? "" : " (optional)"}
								</label>
								<textarea
									id={`${id}-reason`}
									rows={3}
									className={fieldCls}
									placeholder="What rule was broken, in plain words"
									value={reason}
									onChange={(e) => setReason(e.target.value)}
								/>
							</div>
						)}
						{askSource && (
							<div className="space-y-1">
								<label
									htmlFor={`${id}-source`}
									className="text-sm font-medium text-gray-12"
								>
									How did we find out?
								</label>
								<select
									id={`${id}-source`}
									className={fieldCls}
									value={source}
									onChange={(e) =>
										setSource(e.target.value === "report" ? "report" : "own")
									}
								>
									<option value="report">Someone reported it</option>
									<option value="own">We found it ourselves</option>
								</select>
							</div>
						)}
						{askNotify && (
							<label className="flex gap-2 items-start text-sm text-gray-12">
								<input
									type="checkbox"
									className="mt-0.5 size-4 accent-blue-600"
									checked={notify}
									onChange={(e) => setNotify(e.target.checked)}
								/>
								<span>
									{notifyLabel}
									<span className="block text-xs text-gray-10">
										Sent only when a reason is given.
									</span>
								</span>
							</label>
						)}
						{expected !== undefined && (
							<div className="space-y-1">
								<label htmlFor={`${id}-typed`} className="text-sm text-gray-11">
									To confirm, type{" "}
									<span className="font-mono text-gray-12 break-all">
										{expected}
									</span>
									{expectedLabel ? ` (${expectedLabel})` : ""}
								</label>
								<input
									id={`${id}-typed`}
									autoComplete="off"
									className={fieldCls}
									value={typed}
									onChange={(e) => setTyped(e.target.value)}
								/>
							</div>
						)}
					</div>
					<DialogFooter>
						<Button
							type="button"
							size="sm"
							variant="gray"
							disabled={pending}
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							size="sm"
							variant="destructive"
							disabled={pending || !typedOk || !reasonOk}
							spinner={pending}
							onClick={submit}
						>
							{confirmLabel}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

export function NcmecSteps() {
	return (
		<div className="p-3 space-y-2 text-sm rounded-xl border border-red-500/30 bg-red-500/5 text-gray-12">
			<p className="font-medium">
				Suspected child sexual abuse material (CSAM)
			</p>
			<p className="text-gray-11">
				This recording will be hidden, kept for evidence, and never purged
				automatically. The owner is blocked. Then:
			</p>
			<ol className="pl-5 space-y-1 list-decimal text-gray-11">
				<li>
					Report it to the NCMEC CyberTipline at{" "}
					<a
						href="https://report.cybertip.org"
						target="_blank"
						rel="noopener noreferrer"
						className="underline text-gray-12"
					>
						report.cybertip.org
					</a>
					.
				</li>
				<li>
					Preserve everything. Do not delete the recording, the account or the
					logs.
				</li>
				<li>
					Do not download, copy, screenshot or share the content, not even with
					colleagues.
				</li>
				<li>Keep the report receipt with the recording id.</li>
			</ol>
		</div>
	);
}

"use client";

import {
	Button,
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
} from "@cap/ui";
import { useState } from "react";

const REASONS = [
	{ value: "illegal", label: "Illegal content" },
	{ value: "copyright", label: "Copyright infringement" },
	{ value: "harassment", label: "Harassment or hate" },
	{ value: "spam", label: "Spam or scam" },
	{ value: "other", label: "Other" },
] as const;

export function ReportRecordingButton({ videoId }: { videoId: string }) {
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState<string>("");
	const [details, setDetails] = useState("");
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
		"idle",
	);

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!reason || status === "sending") return;
		setStatus("sending");
		try {
			const res = await fetch("/api/report", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ videoId, reason, details, email }),
			});
			setStatus(res.ok ? "done" : "error");
		} catch {
			setStatus("error");
		}
	};

	const onOpenChange = (next: boolean) => {
		setOpen(next);
		if (!next && status === "done") {
			setStatus("idle");
			setReason("");
			setDetails("");
			setEmail("");
		}
	};

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="text-xs text-gray-10 underline-offset-2 transition-colors hover:text-gray-12 hover:underline"
			>
				Report
			</button>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Report this recording</DialogTitle>
					</DialogHeader>
					{status === "done" ? (
						<div className="p-5">
							<p className="text-sm text-gray-12">
								Thanks. We review every report.
							</p>
						</div>
					) : (
						<form onSubmit={submit}>
							<div className="flex flex-col gap-4 p-5">
								<fieldset className="flex flex-col gap-2">
									<legend className="mb-2 text-sm font-medium text-gray-12">
										Reason
									</legend>
									{REASONS.map((r) => (
										<label
											key={r.value}
											className="flex items-center gap-2 text-sm text-gray-12"
										>
											<input
												type="radio"
												name="report-reason"
												value={r.value}
												checked={reason === r.value}
												onChange={() => setReason(r.value)}
											/>
											{r.label}
										</label>
									))}
								</fieldset>
								<div className="flex flex-col gap-1.5">
									<label
										htmlFor="report-details"
										className="text-sm font-medium text-gray-12"
									>
										Details (optional)
									</label>
									<textarea
										id="report-details"
										value={details}
										maxLength={2000}
										rows={4}
										onChange={(e) => setDetails(e.target.value)}
										className="w-full rounded-xl border border-gray-4 bg-gray-1 p-3 text-[16px] text-gray-12 outline-0 hover:border-gray-5 focus:border-gray-5 md:text-[13px]"
									/>
								</div>
								<div className="flex flex-col gap-1.5">
									<label
										htmlFor="report-email"
										className="text-sm font-medium text-gray-12"
									>
										Your email (optional)
									</label>
									<Input
										id="report-email"
										type="email"
										value={email}
										maxLength={254}
										onChange={(e) => setEmail(e.target.value)}
										placeholder="you@example.com"
									/>
								</div>
								{status === "error" && (
									<p className="text-sm text-red-500">
										Something went wrong. Please try again or email
										abuse@screencap.co.
									</p>
								)}
							</div>
							<DialogFooter className="items-center sm:justify-between sm:space-x-0">
								<p className="text-xs text-gray-10">
									You can also email abuse@screencap.co.
								</p>
								<Button
									type="submit"
									variant="dark"
									size="sm"
									disabled={!reason || status === "sending"}
								>
									{status === "sending" ? "Sending..." : "Send report"}
								</Button>
							</DialogFooter>
						</form>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}

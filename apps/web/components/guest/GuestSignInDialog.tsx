"use client";

import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	Input,
} from "@cap/ui";
import { Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
	GUEST_EVENTS,
	type GuestBootstrap,
	type GuestSignInBlocked,
	trackGuestEvent,
} from "@/lib/guest-record";
import { mapGuestSignInError, requestGuestCode } from "@/lib/guest-signin";

const COOLDOWN_MS = 30_000;
const REQUEST_TIMEOUT_MS = 20_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY_CODE = ["", "", "", "", "", ""];
const PERKS = [
	"A link that plays in any browser, nothing to download",
	"No 5-minute limit on your next recordings",
	"Every recording saved in your own library",
];

type Props = {
	open: boolean;
	onSignedIn: (b: GuestBootstrap) => void;
	onBlocked: (b: GuestSignInBlocked) => void;
	onCancel: () => void;
};

function secondsLeft(sentAt: number | null) {
	if (!sentAt) return 0;
	return Math.max(0, Math.ceil((COOLDOWN_MS - (Date.now() - sentAt)) / 1000));
}

async function withTimeout<T>(promise: Promise<T>) {
	let id: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_, reject) => {
		id = setTimeout(() => reject(new Error("timeout")), REQUEST_TIMEOUT_MS);
	});
	try {
		return await Promise.race([promise, timeout]);
	} finally {
		if (id) clearTimeout(id);
	}
}

/**
 * Email one-time-code sign-in without leaving the page. The server flow is the normal one (new
 * emails get an account and organisation, existing emails just sign in, the same sign-up gates
 * apply); we only skip the redirects so the recording in the tab stays put.
 */
export function GuestSignInDialog({
	open,
	onSignedIn,
	onBlocked,
	onCancel,
}: Props) {
	const emailId = useId();
	const [step, setStep] = useState<"email" | "code">("email");
	const [email, setEmail] = useState("");
	const [code, setCode] = useState<string[]>(EMPTY_CODE);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [sentAt, setSentAt] = useState<number | null>(null);
	const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
	const verifying = useRef(false);

	useEffect(() => {
		if (open && step === "code") inputRefs.current[0]?.focus();
	}, [open, step]);

	// Start fresh each time the pop-up is opened.
	useEffect(() => {
		if (!open) return;
		setStep("email");
		setCode(EMPTY_CODE);
		setError(null);
		setNotice(null);
		setBusy(false);
		verifying.current = false;
	}, [open]);

	const block = (message: string) => {
		trackGuestEvent(GUEST_EVENTS.blocked);
		onBlocked({ message });
	};

	const sendCode = async (resend: boolean) => {
		const normalized = email.trim().toLowerCase();
		setError(null);
		setNotice(null);
		if (!EMAIL_PATTERN.test(normalized)) {
			setError("Please enter a valid email address.");
			return;
		}
		const wait = secondsLeft(sentAt);
		if (wait > 0 && resend) {
			setError(`Please wait ${wait} seconds before requesting a new code.`);
			return;
		}
		setBusy(true);
		try {
			const res = await withTimeout(requestGuestCode(normalized));
			if (!res.error) {
				setEmail(normalized);
				setSentAt(Date.now());
				setCode(EMPTY_CODE);
				setStep("code");
				if (resend) setNotice("A new code is on its way.");
				else trackGuestEvent(GUEST_EVENTS.emailSubmitted);
				return;
			}
			const outcome = mapGuestSignInError(res.error);
			if (outcome.kind === "blocked") block(outcome.message);
			else if (outcome.kind === "wait")
				setError("Please wait 30 seconds before requesting a new code.");
			else setError("We could not send a code. Please try again.");
		} catch {
			setError(
				"That is taking longer than expected. Check your connection and try again.",
			);
		} finally {
			setBusy(false);
		}
	};

	const verify = async (digits: string) => {
		if (digits.length !== 6 || verifying.current) return;
		verifying.current = true;
		setBusy(true);
		setError(null);
		try {
			// Same two calls as the verify-otp page, minus the redirect.
			const callback = await fetch(
				`/api/auth/callback/email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(digits)}&callbackUrl=${encodeURIComponent(window.location.pathname)}`,
			);
			// A refused sign-in redirects to /login?error=...; fetch follows it, so read it off the final URL.
			const refused = mapGuestSignInError(
				new URL(callback.url, window.location.origin).searchParams.get("error"),
			);
			if (refused.kind === "blocked") {
				verifying.current = false;
				setBusy(false);
				block(refused.message);
				return;
			}
			const session = await (await fetch("/api/auth/session")).json();
			if (!session?.user) {
				setCode(EMPTY_CODE);
				setError("That code did not work. Check it and try again.");
				verifying.current = false;
				setBusy(false);
				inputRefs.current[0]?.focus();
				return;
			}
			const res = await fetch("/api/record/bootstrap", { cache: "no-store" });
			if (!res.ok) throw new Error("bootstrap failed");
			const bootstrap = (await res.json()) as GuestBootstrap;
			trackGuestEvent(GUEST_EVENTS.verified);
			onSignedIn(bootstrap);
			// Leave busy on: the page closes this pop-up when it takes over.
		} catch {
			verifying.current = false;
			setBusy(false);
			setError("Something went wrong. Please try again.");
		}
	};

	const handleChange = (index: number, value: string) => {
		if (value.length > 1) {
			const next = [...code];
			value
				.slice(0, 6)
				.split("")
				.forEach((d, i) => {
					if (index + i < 6) next[index + i] = d;
				});
			setCode(next);
			const empty = next.indexOf("");
			inputRefs.current[empty === -1 ? 5 : empty]?.focus();
			if (next.every(Boolean)) void verify(next.join(""));
			return;
		}
		const next = [...code];
		next[index] = value;
		setCode(next);
		if (value && index < 5) inputRefs.current[index + 1]?.focus();
		if (next.every(Boolean)) void verify(next.join(""));
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				if (!o && !busy) onCancel();
			}}
		>
			<DialogContent className="w-[calc(100%-32px)] max-w-[440px] overflow-hidden rounded-2xl bg-gray-1">
				<div className="px-6 pt-7 pb-5 text-center bg-gradient-to-b from-blue-3 to-gray-1 sm:px-8">
					<span className="inline-flex gap-1.5 items-center px-2.5 py-1 text-xs font-semibold rounded-full text-[#17663f] bg-[#dcf5e6]">
						<Check className="size-3.5" strokeWidth={3} aria-hidden />
						Your recording is ready
					</span>
					<DialogTitle className="mt-4 text-2xl font-semibold tracking-tight text-gray-12">
						{step === "email" ? "Get your share link" : "Check your email"}
					</DialogTitle>
					<DialogDescription className="mt-2 text-sm leading-relaxed text-gray-11">
						{step === "email" ? (
							"Create your free Screencap account to share it. It takes about 20 seconds."
						) : (
							<>
								Enter the 6-digit code we sent to{" "}
								<span className="font-medium text-gray-12">{email}</span>.
							</>
						)}
					</DialogDescription>
				</div>

				<div className="px-6 pb-6 sm:px-8">
					{step === "email" ? (
						<>
							<ul className="flex flex-col gap-2.5 p-4 mb-5 text-sm text-left rounded-xl border bg-gray-2 border-gray-4">
								{PERKS.map((perk) => (
									<li
										key={perk}
										className="flex gap-2.5 items-start text-gray-12"
									>
										<span className="flex flex-none justify-center items-center mt-px rounded-full size-5 bg-blue-3 text-blue-11">
											<Check className="size-3" strokeWidth={3} aria-hidden />
										</span>
										{perk}
									</li>
								))}
							</ul>
							<form
								noValidate
								className="flex flex-col gap-3"
								onSubmit={(e) => {
									e.preventDefault();
									void sendCode(false);
								}}
							>
								<label htmlFor={emailId} className="sr-only">
									Email address
								</label>
								<Input
									id={emailId}
									type="email"
									autoComplete="email"
									inputMode="email"
									placeholder="you@example.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									disabled={busy}
									autoFocus
									className="h-12 text-base"
								/>
								<Button
									type="submit"
									variant="blue"
									size="lg"
									className="w-full"
									spinner={busy}
									disabled={busy}
								>
									{busy ? "Sending code..." : "Get my link"}
								</Button>
								<p className="text-xs leading-relaxed text-center text-gray-10">
									We'll email you a 6-digit code. No password needed.
									<br />
									By continuing you agree to the{" "}
									<Link
										href="/terms"
										target="_blank"
										className="underline text-gray-11 hover:text-gray-12"
									>
										Terms
									</Link>{" "}
									and{" "}
									<Link
										href="/privacy"
										target="_blank"
										className="underline text-gray-11 hover:text-gray-12"
									>
										Privacy Policy
									</Link>
									.
								</p>
							</form>
						</>
					) : (
						<div className="flex flex-col gap-4">
							<div className="flex gap-2 justify-between">
								{code.map((digit, index) => (
									<input
										key={index.toString()}
										ref={(el) => {
											inputRefs.current[index] = el;
										}}
										type="text"
										inputMode="numeric"
										pattern="[0-9]*"
										maxLength={1}
										autoComplete={index === 0 ? "one-time-code" : "off"}
										aria-label={`Digit ${index + 1} of 6`}
										value={digit}
										disabled={busy}
										onChange={(e) =>
											handleChange(index, e.target.value.replace(/\D/g, ""))
										}
										onKeyDown={(e) => {
											if (e.key === "Backspace" && !code[index] && index > 0)
												inputRefs.current[index - 1]?.focus();
										}}
										onPaste={(e) => {
											e.preventDefault();
											handleChange(
												0,
												e.clipboardData.getData("text").replace(/\D/g, ""),
											);
										}}
										className="flex-1 min-w-0 h-14 text-2xl font-semibold text-center rounded-xl border transition-all text-gray-12 bg-gray-1 border-gray-5 focus:outline-none focus:ring-2 focus:ring-blue-9 focus:border-transparent"
									/>
								))}
							</div>
							<Button
								variant="blue"
								size="lg"
								className="w-full"
								spinner={busy}
								disabled={busy}
								onClick={() => {
									if (code.some((d) => !d)) {
										setError("Enter all 6 digits of the code.");
										return;
									}
									void verify(code.join(""));
								}}
							>
								{busy ? "Checking..." : "Get my link"}
							</Button>
							<div className="flex flex-wrap gap-x-4 gap-y-1 justify-center text-sm">
								<button
									type="button"
									disabled={busy}
									onClick={() => void sendCode(true)}
									className="underline text-gray-10 hover:text-gray-12"
								>
									Resend code
								</button>
								<button
									type="button"
									disabled={busy}
									onClick={() => {
										setStep("email");
										setCode(EMPTY_CODE);
										setError(null);
										setNotice(null);
									}}
									className="underline text-gray-10 hover:text-gray-12"
								>
									Use a different email
								</button>
							</div>
						</div>
					)}

					<div
						aria-live="polite"
						className="mt-3 text-sm text-center empty:hidden"
					>
						{error ? (
							<p role="alert" className="text-red-500">
								{error}
							</p>
						) : notice ? (
							<p className="text-gray-11">{notice}</p>
						) : null}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

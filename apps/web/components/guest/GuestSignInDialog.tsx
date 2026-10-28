"use client";

import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	Input,
} from "@cap/ui";
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
			<DialogContent className="p-6">
				<DialogHeader>
					<DialogTitle>
						{step === "email"
							? "Enter your email to get your link"
							: "Enter your 6-digit code"}
					</DialogTitle>
					<DialogDescription>
						{step === "email"
							? "We will email you a code to confirm it is you. No password needed."
							: `We sent a code to ${email}. It can take a minute to arrive.`}
					</DialogDescription>
				</DialogHeader>

				{step === "email" ? (
					<form
						noValidate
						className="flex flex-col gap-3 mt-4"
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
						/>
						<Button
							type="submit"
							variant="primary"
							className="w-full"
							spinner={busy}
							disabled={busy || !email.trim()}
						>
							{busy ? "Sending..." : "Send code"}
						</Button>
						<p className="text-xs text-center text-gray-9">
							By continuing you agree to Screencap's{" "}
							<Link
								href="/terms"
								target="_blank"
								className="font-semibold text-gray-12 hover:text-blue-300"
							>
								Terms of Service
							</Link>{" "}
							and{" "}
							<Link
								href="/privacy"
								target="_blank"
								className="font-semibold text-gray-12 hover:text-blue-300"
							>
								Privacy Policy
							</Link>
							.
						</p>
					</form>
				) : (
					<div className="flex flex-col gap-3 mt-4">
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
									className="flex-1 min-w-0 h-[52px] text-xl font-semibold text-center rounded-lg border transition-all text-gray-12 bg-gray-1 border-gray-5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							))}
						</div>
						<Button
							variant="primary"
							className="w-full"
							spinner={busy}
							disabled={busy || code.some((d) => !d)}
							onClick={() => void verify(code.join(""))}
						>
							{busy ? "Checking..." : "Verify code"}
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

				<div aria-live="polite" className="min-h-5 mt-3 text-sm text-center">
					{error ? (
						<p role="alert" className="text-red-500">
							{error}
						</p>
					) : notice ? (
						<p className="text-gray-11">{notice}</p>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	);
}

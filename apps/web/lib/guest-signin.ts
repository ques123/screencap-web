// Maps next-auth's sign-in error codes to what the guest pop-up should do. Shared with the tests.
// Never says which rule fired beyond what the signup page already says in public.

export type GuestSignInOutcome =
	| { kind: "blocked"; message: string }
	| { kind: "wait" }
	| { kind: "failed" };

export const GUEST_BLOCKED_MESSAGES = {
	// Blocked email, blocked domain or blocked account.
	SignupBlocked: "This email can't create a Screencap account right now.",
	// New accounts from this country are closed.
	SignupCountryBlocked:
		"Screencap isn't available for new sign-ups in your country yet.",
	// Invite-only mode, new email outside the allowed domains (next-auth maps `false` to this).
	AccessDenied: "This email can't create a Screencap account right now.",
} as const;

export function mapGuestSignInError(
	error: string | null | undefined,
): GuestSignInOutcome {
	if (error && error in GUEST_BLOCKED_MESSAGES) {
		return {
			kind: "blocked",
			message:
				GUEST_BLOCKED_MESSAGES[error as keyof typeof GUEST_BLOCKED_MESSAGES],
		};
	}
	// next-auth reports every other email failure (including its own rate limit) as EmailSignin.
	if (error === "EmailSignin") return { kind: "wait" };
	return { kind: "failed" };
}

/**
 * Asks next-auth to email a sign-in code, without next-auth's client helper: when a sign-up gate
 * refuses the email, the server answers with a relative URL ("/login?error=SignupBlocked") that the
 * helper cannot parse, so the refusal surfaced as a generic failure. Returns the error code, if any.
 */
export async function requestGuestCode(
	email: string,
): Promise<{ error: string | null }> {
	const { csrfToken } = (await fetch("/api/auth/csrf").then((r) =>
		r.json(),
	)) as { csrfToken: string };
	const res = await fetch("/api/auth/signin/email", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"X-Auth-Return-Redirect": "1",
		},
		body: new URLSearchParams({
			email,
			csrfToken,
			callbackUrl: `${location.origin}/record`,
			json: "true",
		}),
	});
	const data = (await res.json().catch(() => ({}))) as { url?: string };
	if (!res.ok && !data.url) return { error: "EmailSignin" };
	return {
		error: new URL(data.url ?? "/", location.origin).searchParams.get("error"),
	};
}

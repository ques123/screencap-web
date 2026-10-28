// Guest recording (/record): anyone can record in the browser without an account. Nothing is
// uploaded until they verify their email with a one-time code in a pop-up on the same page; then the
// recording is created in their account, uploaded, and the share page opens with the link copied.
// Shared contract between the recorder (guest mode) and the sign-in pop-up.

/** Guests can record up to 5 minutes; signed-in users keep their normal limits. */
export const GUEST_MAX_RECORDING_MS = 5 * 60 * 1000;

/** What the page needs once the guest has signed in (GET /api/record/bootstrap). */
export type GuestBootstrap = {
	userId: string;
	email: string;
	organisationId: string;
	isPro: boolean;
	/** Admin "max recording minutes" setting for this user, in seconds, or null for no limit. */
	maxRecordingSeconds: number | null;
};

/** Why sign-up was refused, in plain words for the pop-up ("This email can't sign up ..."). */
export type GuestSignInBlocked = { message: string };

/** Umami / Matomo event names for the guest funnel (category "guest-record" in Matomo). */
export const GUEST_EVENTS = {
	start: "guest-record-start",
	stop: "guest-record-stop",
	emailSubmitted: "guest-record-email",
	verified: "guest-record-verified",
	blocked: "guest-record-blocked",
	uploaded: "guest-record-uploaded",
	downloaded: "guest-record-download",
} as const;

export function trackGuestEvent(
	name: (typeof GUEST_EVENTS)[keyof typeof GUEST_EVENTS],
) {
	try {
		const w = window as unknown as {
			umami?: { track: (n: string) => void };
			_paq?: unknown[][];
		};
		w.umami?.track(name);
		w._paq?.push(["trackEvent", "guest-record", name]);
	} catch {
		// analytics must never break recording
	}
}

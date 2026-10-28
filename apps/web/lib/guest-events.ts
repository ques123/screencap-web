import { GUEST_EVENT_KEYS, type GuestEventKey } from "@/lib/guest-record";

// Validation for POST /api/record/events (guest-recording funnel steps). Shared with the tests.

const ATTEMPT_RE = /^[0-9a-f-]{36}$/i;
// One attempt is a handful of steps; anything past this is a script, not a person.
export const MAX_EVENTS_PER_ATTEMPT = 30;

export function parseGuestEvent(
	body: unknown,
): { attemptId: string; event: GuestEventKey } | null {
	if (!body || typeof body !== "object") return null;
	const { attemptId, event } = body as Record<string, unknown>;
	if (typeof attemptId !== "string" || !ATTEMPT_RE.test(attemptId)) return null;
	if (
		typeof event !== "string" ||
		!GUEST_EVENT_KEYS.includes(event as GuestEventKey)
	)
		return null;
	return { attemptId: attemptId.toLowerCase(), event: event as GuestEventKey };
}

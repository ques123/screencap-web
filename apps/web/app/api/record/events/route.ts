import { db } from "@cap/database";
import { getCurrentUser } from "@cap/database/auth/session";
import { screencapGuestEvents } from "@cap/database/schema";
import { count, eq } from "drizzle-orm";
import { MAX_EVENTS_PER_ATTEMPT, parseGuestEvent } from "@/lib/guest-events";

// Anonymous guest-recording funnel steps from /record (see trackGuestEvent). No sign-in needed; the
// user id is attached once they have verified. Always answers 204 so the page never waits on it.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	const parsed = parseGuestEvent(await request.json().catch(() => null));
	if (!parsed) return new Response(null, { status: 204 });
	try {
		const [row] = await db()
			.select({ n: count() })
			.from(screencapGuestEvents)
			.where(eq(screencapGuestEvents.attemptId, parsed.attemptId));
		if ((row?.n ?? 0) >= MAX_EVENTS_PER_ATTEMPT)
			return new Response(null, { status: 204 });
		const user = await getCurrentUser().catch(() => null);
		await db()
			.insert(screencapGuestEvents)
			.values({
				attemptId: parsed.attemptId,
				event: parsed.event,
				userId: user?.id ?? null,
			});
	} catch (error) {
		console.error("[guest-events] insert failed", error);
	}
	return new Response(null, { status: 204 });
}

import { db } from "@cap/database";
import { getCurrentUser } from "@cap/database/auth/session";
import { authApiKeys } from "@cap/database/schema";
import { eq } from "drizzle-orm";
import { maxRecordingSecondsFor } from "@/lib/screencap-limits";

// Non-sensitive: lets the browser recorder and the Mac app stop at the configured limit (set in the
// admin panel, env as fallback). Signed-in callers (cookie, or the Mac app's API key) get their own
// limit when an admin gave them a different one.
export const dynamic = "force-dynamic";

async function callerUserId(request: Request): Promise<string | undefined> {
	try {
		const key = request.headers.get("authorization")?.split(" ")[1];
		if (key?.length === 36) {
			const [row] = await db()
				.select({ userId: authApiKeys.userId })
				.from(authApiKeys)
				.where(eq(authApiKeys.id, key))
				.limit(1);
			return row ? String(row.userId) : undefined;
		}
		const user = await getCurrentUser();
		return user ? String(user.id) : undefined;
	} catch {
		return undefined;
	}
}

export async function GET(request: Request) {
	const userId = await callerUserId(request);
	return Response.json(
		{ maxRecordingSeconds: await maxRecordingSecondsFor(userId) },
		{ headers: { "cache-control": "no-store" } },
	);
}

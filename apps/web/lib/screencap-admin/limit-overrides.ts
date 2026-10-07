import { db } from "@cap/database";
import { screencapUserAdmin } from "@cap/database/schema";
import type { User } from "@cap/web-domain";
import { eq } from "drizzle-orm";

// Per-user limit overrides, read by the upload/recording limit checks. Kept apart from users.ts (which is
// server-only and pulls in the whole admin service) so those hot paths and their tests stay light.
export async function getUserLimitOverrides(userId: string): Promise<{
	storageHoursOverride: number | null;
	recordingMinutesOverride: number | null;
}> {
	try {
		const [row] = await db()
			.select({
				s: screencapUserAdmin.storageHoursOverride,
				r: screencapUserAdmin.recordingMinutesOverride,
			})
			.from(screencapUserAdmin)
			.where(eq(screencapUserAdmin.userId, userId as User.UserId))
			.limit(1);
		return {
			storageHoursOverride: row?.s ?? null,
			recordingMinutesOverride: row?.r ?? null,
		};
	} catch {
		return { storageHoursOverride: null, recordingMinutesOverride: null };
	}
}

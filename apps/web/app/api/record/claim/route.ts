import { db } from "@cap/database";
import { getCurrentUser } from "@cap/database/auth/session";
import { screencapVideoClients, videos } from "@cap/database/schema";
import { eq } from "drizzle-orm";

// Marks a recording as made by someone who recorded as a guest first, so the admin panel can count
// guest-to-account conversions. Only the video's owner can call it. Safe to call twice.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	const user = await getCurrentUser();
	if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

	const body = await request.json().catch(() => null);
	const videoId =
		body && typeof body.videoId === "string" ? body.videoId.trim() : "";
	if (!videoId || videoId.length > 64) {
		return Response.json({ error: "videoId is required" }, { status: 400 });
	}

	const [video] = await db()
		.select({ ownerId: videos.ownerId })
		.from(videos)
		.where(eq(videos.id, videoId as typeof videos.$inferSelect.id))
		.limit(1);
	// Same answer for "missing" and "not yours" so ids can't be probed.
	if (!video || String(video.ownerId) !== String(user.id)) {
		return Response.json({ error: "Video not found" }, { status: 404 });
	}

	await db()
		.insert(screencapVideoClients)
		.values({
			videoId: videoId as typeof screencapVideoClients.$inferInsert.videoId,
			client: "web-recorder",
			detail: "guest",
		})
		.onDuplicateKeyUpdate({ set: { detail: "guest" } });

	return Response.json({ ok: true });
}

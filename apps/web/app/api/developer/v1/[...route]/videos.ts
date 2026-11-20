import { db } from "@cap/database";
import { developerVideos } from "@cap/database/schema";
import { provideOptionalAuth, S3Buckets } from "@cap/web-backend";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Effect, Option } from "effect";
import { Hono } from "hono";
import { runPromise } from "@/lib/server";
import { withDeveloperSecretAuth } from "../../../utils";

export const app = new Hono<{
	Variables: {
		developerAppId: string;
		developerKeyType: "secret";
	};
}>().use(withDeveloperSecretAuth);

app.get("/", async (c) => {
	const appId = c.get("developerAppId");
	const userId = c.req.query("userId");
	const limit = Math.min(Number(c.req.query("limit") ?? 50) || 50, 100);
	const offset = Math.max(0, Number(c.req.query("offset") ?? 0) || 0);

	const conditions = [
		eq(developerVideos.appId, appId),
		isNull(developerVideos.deletedAt),
	];

	if (userId) {
		conditions.push(eq(developerVideos.externalUserId, userId));
	}

	const videos = await db()
		.select()
		.from(developerVideos)
		.where(and(...conditions))
		.orderBy(desc(developerVideos.createdAt))
		.limit(limit)
		.offset(offset);

	return c.json({ data: videos });
});

app.get("/:id", async (c) => {
	const appId = c.get("developerAppId");
	const videoId = c.req.param("id");

	const [video] = await db()
		.select()
		.from(developerVideos)
		.where(
			and(
				eq(developerVideos.id, videoId),
				eq(developerVideos.appId, appId),
				isNull(developerVideos.deletedAt),
			),
		)
		.limit(1);

	if (!video) {
		return c.json({ error: "Video not found" }, 404);
	}

	return c.json({ data: video });
});

app.delete("/:id", async (c) => {
	const appId = c.get("developerAppId");
	const videoId = c.req.param("id");

	const [video] = await db()
		.select()
		.from(developerVideos)
		.where(
			and(
				eq(developerVideos.id, videoId),
				eq(developerVideos.appId, appId),
				isNull(developerVideos.deletedAt),
			),
		)
		.limit(1);

	if (!video) {
		return c.json({ error: "Video not found" }, 404);
	}

	await db()
		.update(developerVideos)
		.set({ deletedAt: new Date() })
		.where(eq(developerVideos.id, videoId));

	return c.json({ success: true });
});

// Short-lived signed link to the uploaded video file, for server-side processing
// (e.g. transcription) by the developer's own backend. Secret key only.
app.get("/:id/download", async (c) => {
	const appId = c.get("developerAppId");
	const videoId = c.req.param("id");

	const [video] = await db()
		.select({ id: developerVideos.id, s3Key: developerVideos.s3Key })
		.from(developerVideos)
		.where(
			and(
				eq(developerVideos.id, videoId),
				eq(developerVideos.appId, appId),
				isNull(developerVideos.deletedAt),
			),
		)
		.limit(1);

	if (!video || !video.s3Key) {
		return c.json({ error: "Video not found" }, 404);
	}

	const expiresIn = 3600;
	const s3Key = video.s3Key;
	try {
		const url = await Effect.gen(function* () {
			const [bucket] = yield* S3Buckets.getBucketAccess(Option.none());
			return yield* bucket.getSignedObjectUrl(s3Key, { expiresIn });
		}).pipe(provideOptionalAuth, runPromise);
		return c.json({
			data: {
				url,
				expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
			},
		});
	} catch (error) {
		console.error("Error signing developer video download:", error);
		return c.json({ error: "Failed to create download link" }, 500);
	}
});

app.get("/:id/status", async (c) => {
	const appId = c.get("developerAppId");
	const videoId = c.req.param("id");

	const [video] = await db()
		.select({
			id: developerVideos.id,
			duration: developerVideos.duration,
			width: developerVideos.width,
			height: developerVideos.height,
			transcriptionStatus: developerVideos.transcriptionStatus,
		})
		.from(developerVideos)
		.where(
			and(
				eq(developerVideos.id, videoId),
				eq(developerVideos.appId, appId),
				isNull(developerVideos.deletedAt),
			),
		)
		.limit(1);

	if (!video) {
		return c.json({ error: "Video not found" }, 404);
	}

	const ready = video.duration !== null && video.width !== null;

	return c.json({
		data: {
			...video,
			ready,
		},
	});
});

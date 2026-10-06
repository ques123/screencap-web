import { db } from "@cap/database";
import * as Db from "@cap/database/schema";
import type { Video } from "@cap/web-domain";
import * as Dz from "drizzle-orm";

export interface CountViewsForVideosInput {
	videoIds: ReadonlyArray<Video.VideoId>;
	tenantId?: string;
	since?: Date;
}

/**
 * Own view counts: a view is a distinct session id per video, matching the
 * semantics of the Tinybird queries. Videos without views map to 0.
 */
export const countViewsForVideos = async ({
	videoIds,
	tenantId,
	since,
}: CountViewsForVideosInput): Promise<Map<Video.VideoId, number>> => {
	const counts = new Map<Video.VideoId, number>();
	const uniqueIds = Array.from(new Set(videoIds));
	for (const id of uniqueIds) counts.set(id, 0);
	if (uniqueIds.length === 0) return counts;

	const rows = await db()
		.select({
			videoId: Db.videoViews.videoId,
			views: Dz.countDistinct(Db.videoViews.sessionId),
		})
		.from(Db.videoViews)
		.where(
			Dz.and(
				Dz.inArray(Db.videoViews.videoId, uniqueIds),
				tenantId ? Dz.eq(Db.videoViews.tenantId, tenantId) : undefined,
				since ? Dz.gte(Db.videoViews.createdAt, since) : undefined,
			),
		)
		.groupBy(Db.videoViews.videoId);

	for (const row of rows) {
		const value = Number(row.views ?? 0);
		counts.set(row.videoId, Number.isFinite(value) ? value : 0);
	}
	return counts;
};

export const deleteViewsForVideo = async (videoId: Video.VideoId) => {
	await db().delete(Db.videoViews).where(Dz.eq(Db.videoViews.videoId, videoId));
};

import { db } from "@cap/database";
import { videos } from "@cap/database/schema";
import type { VideoMetadata } from "@cap/database/types";
import { Video } from "@cap/web-domain";
import { eq } from "drizzle-orm";

const FRESH_VIDEO_MAX_AGE_MS = 3 * 60 * 1000;

type TitleRow = {
	name: string;
	createdAt: Date;
	metadata: VideoMetadata | null;
	transcriptionStatus: string | null;
};

async function readTitleRow(videoId: string): Promise<TitleRow | null> {
	const [row] = await db()
		.select({
			name: videos.name,
			createdAt: videos.createdAt,
			metadata: videos.metadata,
			transcriptionStatus: videos.transcriptionStatus,
		})
		.from(videos)
		.where(eq(videos.id, Video.VideoId.make(videoId)))
		.limit(1);
	return (row as TitleRow | undefined) ?? null;
}

function isGenerationInFlight(row: TitleRow) {
	const metadata = row.metadata;
	const aiStatus = metadata?.aiGenerationStatus;
	return (
		metadata?.liveTranscript?.status === "active" ||
		row.transcriptionStatus === null ||
		row.transcriptionStatus === "PROCESSING" ||
		aiStatus === "QUEUED" ||
		aiStatus === "PROCESSING"
	);
}

function shouldWait(row: TitleRow) {
	if (row.metadata?.aiTitle || row.metadata?.titleManuallyEdited) return false;
	if (Date.now() - new Date(row.createdAt).getTime() >= FRESH_VIDEO_MAX_AGE_MS)
		return false;
	return isGenerationInFlight(row);
}

/**
 * Link-preview crawlers fetch a share page seconds after a recording stops,
 * usually before the AI title exists. Wait briefly for it so the preview isn't
 * stuck on the placeholder name. Returns the latest name, or null when it
 * decided not to wait (or anything failed), so callers keep their own name.
 */
export async function waitForGeneratedTitle(
	videoId: string,
	{
		maxWaitMs = 6000,
		pollMs = 500,
	}: { maxWaitMs?: number; pollMs?: number } = {},
): Promise<string | null> {
	try {
		const first = await readTitleRow(videoId);
		if (!first || !shouldWait(first)) return null;

		const initialName = first.name;
		let latestName = first.name;
		const deadline = Date.now() + maxWaitMs;

		while (Date.now() < deadline) {
			await new Promise((resolve) =>
				setTimeout(resolve, Math.min(pollMs, deadline - Date.now())),
			);
			const row = await readTitleRow(videoId);
			if (!row) return latestName;
			latestName = row.name;
			if (
				row.metadata?.aiTitle ||
				row.metadata?.titleManuallyEdited ||
				row.name !== initialName
			) {
				return row.name;
			}
		}
		return latestName;
	} catch {
		return null;
	}
}

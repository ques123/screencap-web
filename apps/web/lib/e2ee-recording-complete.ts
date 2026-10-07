import { db } from "@cap/database";
import { videos, videoUploads } from "@cap/database/schema";
import { Storage } from "@cap/web-backend";
import { Video } from "@cap/web-domain";
import { eq } from "drizzle-orm";
import { Effect, Option } from "effect";
import {
	buildE2eeReceipt,
	E2eeFinalizeError,
	type E2eeReceipt,
	planE2eeFinalize,
	sha256Hex,
} from "@/lib/e2ee-finalize";
import * as EffectRuntime from "@/lib/server";
import { decodeStorageVideo } from "@/lib/video-storage";

const HEAD_CONCURRENCY = 16;

export async function finalizeE2eeRecording(input: {
	video: typeof videos.$inferSelect;
	manifestSha256?: string;
	requiredAudio?: boolean;
}): Promise<E2eeReceipt> {
	const { video } = input;
	const source = new Video.SegmentsSource({
		videoId: video.id,
		ownerId: video.ownerId,
	});

	const [bucket] = await EffectRuntime.runPromise(
		Storage.getAccessForVideo(decodeStorageVideo(video)),
	);
	const content = await EffectRuntime.runPromise(
		bucket.getObject(source.getManifestKey()),
	);
	if (Option.isNone(content))
		throw new E2eeFinalizeError("manifest-missing", "Manifest is missing");
	const manifestJson = content.value;
	const manifestSha256 = input.manifestSha256 ?? sha256Hex(manifestJson);
	const plan = planE2eeFinalize({
		manifestJson,
		manifestSha256,
		requiredAudio: input.requiredAudio ?? false,
		source,
	});
	const heads = await EffectRuntime.runPromise(
		Effect.forEach(
			plan.expectedKeys,
			(key) =>
				bucket.headObject(key).pipe(
					Effect.map((head) => [key, head.ContentLength ?? null] as const),
					Effect.catchAll(() => Effect.succeed([key, null] as const)),
				),
			{ concurrency: HEAD_CONCURRENCY },
		),
	);
	const receipt = buildE2eeReceipt({
		videoId: video.id,
		artifact: { kind: "segments", manifestSha256 },
		plan,
		sizes: new Map(heads),
	});

	await db().transaction(async (tx) => {
		await tx
			.update(videos)
			.set({ duration: receipt.duration })
			.where(eq(videos.id, video.id));
		await tx.delete(videoUploads).where(eq(videoUploads.videoId, video.id));
	});

	return receipt;
}

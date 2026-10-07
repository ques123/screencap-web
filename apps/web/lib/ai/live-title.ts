import { db } from "@cap/database";
import { organizations, videos } from "@cap/database/schema";
import type { VideoMetadata } from "@cap/database/types";
import { parseAiGenerationLanguage, type Video } from "@cap/web-domain";
import { generateText } from "ai";
import { and, eq, sql } from "drizzle-orm";
import { getByokGeneration } from "@/lib/ai/byok";
import { isAiConfigured } from "@/lib/ai/provider";
import { runWithAiProviders } from "@/lib/ai/run";
import {
	getAiLanguageInstruction,
	shouldReplaceVideoTitle,
} from "@/lib/ai/video-title";

export type DraftTitleResult =
	| { status: "updated"; title: string }
	| { status: "skipped"; reason: string }
	| { status: "failed"; reason: string };

const HEAD_CHARS = 2000;
const TAIL_CHARS = 4000;
const MAX_TITLE_CHARS = 80;
const TITLE_TIMEOUT_MS = 15_000;

const getAffectedRows = (result: unknown) => {
	if (Array.isArray(result)) {
		return (
			(result[0] as { affectedRows?: number } | undefined)?.affectedRows ?? 0
		);
	}
	return (result as { affectedRows?: number } | undefined)?.affectedRows ?? 0;
};

export function trimTranscriptForTitle(text: string): string {
	const trimmed = text.trim();
	if (trimmed.length <= HEAD_CHARS + TAIL_CHARS) return trimmed;
	return `${trimmed.slice(0, HEAD_CHARS)}\n[...]\n${trimmed.slice(-TAIL_CHARS)}`;
}

export function cleanDraftTitle(raw: string): string {
	let title = raw
		.replace(/```[a-z]*/gi, " ")
		.replace(/^\s*(title\s*:)\s*/i, "")
		.replace(/[*_`#>]+/g, "")
		.replace(/\s+/g, " ")
		.trim();
	title = title.replace(/^["'“”‘’«»]+|["'“”‘’«»]+$/g, "").trim();
	title = title.replace(/[.。]+$/, "").trim();
	if (title.length > MAX_TITLE_CHARS) {
		title = title.slice(0, MAX_TITLE_CHARS).trim();
	}
	return title;
}

export function buildLiveTitlePrompt(
	transcript: string,
	languageInstruction: string,
): string {
	return `You are naming a screen recording that is still in progress, using a partial transcript.
Write ONE short, specific title of 3 to 8 words that says what the video is about.
- ${languageInstruction}
- Output only the title: no quotes, no markdown, no trailing period, no preamble.
- Be concrete (name the product, task or topic). Never use generic titles such as "Screen Recording" or "Video Update".

Partial transcript:
${transcript}`;
}

export async function draftLiveTitle(input: {
	videoId: string;
	ownerId: string;
	transcriptText: string;
	language: string | null;
}): Promise<DraftTitleResult> {
	try {
		const transcript = trimTranscriptForTitle(input.transcriptText ?? "");
		if (!transcript) return { status: "skipped", reason: "empty transcript" };

		const rows = await db()
			.select({ video: videos, orgSettings: organizations.settings })
			.from(videos)
			.leftJoin(organizations, eq(videos.orgId, organizations.id))
			.where(eq(videos.id, input.videoId as Video.VideoId));
		const row = rows[0];
		if (!row?.video) return { status: "skipped", reason: "video not found" };

		const { video, orgSettings } = row;
		const metadata = (video.metadata as VideoMetadata | null) ?? {};

		if (video.settings?.disableTranscript || orgSettings?.disableTranscript) {
			return { status: "skipped", reason: "transcript disabled" };
		}
		if (metadata.titleManuallyEdited) {
			return { status: "skipped", reason: "title manually edited" };
		}
		if (metadata.aiGenerationStatus === "COMPLETE") {
			return { status: "skipped", reason: "final generation complete" };
		}

		const byok = await getByokGeneration(input.ownerId);
		if (!byok && !isAiConfigured("generation")) {
			return { status: "skipped", reason: "no AI available" };
		}

		const languageInstruction = getAiLanguageInstruction(
			parseAiGenerationLanguage(orgSettings?.aiGenerationLanguage),
		);
		const prompt = buildLiveTitlePrompt(transcript, languageInstruction);

		const raw = await runWithAiProviders(
			"generation",
			async (selection) => {
				const result = await generateText({
					model: selection.model(),
					prompt,
					maxOutputTokens: 60,
					abortSignal: AbortSignal.timeout(TITLE_TIMEOUT_MS),
				});
				if (!cleanDraftTitle(result.text)) {
					throw new Error("Empty title from model");
				}
				return result.text;
			},
			{ byok },
		);

		const title = cleanDraftTitle(raw);
		if (!title) return { status: "failed", reason: "empty title" };

		// Atomic, key-scoped write; never overwrites a final pass or manual edit.
		const metadataResult = await db()
			.update(videos)
			.set({
				metadata: sql`JSON_SET(COALESCE(${videos.metadata}, JSON_OBJECT()), '$.aiTitle', ${title})`,
			})
			.where(
				and(
					eq(videos.id, input.videoId as Video.VideoId),
					sql`COALESCE(JSON_UNQUOTE(JSON_EXTRACT(${videos.metadata}, '$.aiGenerationStatus')), '') <> 'COMPLETE'`,
					sql`COALESCE(JSON_UNQUOTE(JSON_EXTRACT(${videos.metadata}, '$.titleManuallyEdited')), 'false') <> 'true'`,
				),
			);
		if (getAffectedRows(metadataResult) === 0) {
			return { status: "skipped", reason: "video changed during draft" };
		}

		if (
			shouldReplaceVideoTitle({
				currentTitle: video.name,
				previousAiTitle: metadata.aiTitle,
				nextAiTitle: title,
				sourceName: metadata.sourceName,
				titleManuallyEdited: metadata.titleManuallyEdited,
			})
		) {
			// Guarded on the name we read so a racing user rename wins.
			await db()
				.update(videos)
				.set({ name: title })
				.where(
					and(
						eq(videos.id, input.videoId as Video.VideoId),
						eq(videos.name, video.name),
					),
				);
		}

		return { status: "updated", title };
	} catch (error) {
		return {
			status: "failed",
			reason: error instanceof Error ? error.message : String(error),
		};
	}
}

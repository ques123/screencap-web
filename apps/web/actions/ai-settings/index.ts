"use server";

import { getCurrentUser } from "@cap/database/auth/session";
import { revalidatePath } from "next/cache";
import {
	clearUserOpenRouterKey,
	setUserOpenRouterKey,
	updateUserAiPreferences,
} from "@/lib/ai/byok";
import {
	isAvailableSummaryModel,
	isSupportedTranscriptionModel,
} from "@/lib/openrouter/catalog";
import { OpenRouterError, verifyOpenRouterKey } from "@/lib/openrouter/client";

export type AiSettingsResult = { ok: true } | { ok: false; error: string };

const SETTINGS_PATH = "/dashboard/settings/ai";

export async function saveOpenRouterKey(
	rawKey: string,
): Promise<AiSettingsResult> {
	const user = await getCurrentUser();
	if (!user) return { ok: false, error: "You need to sign in" };

	const key = typeof rawKey === "string" ? rawKey.trim() : "";
	if (!key.startsWith("sk-or-")) {
		return { ok: false, error: "OpenRouter keys start with sk-or-" };
	}

	try {
		const info = await verifyOpenRouterKey(key);
		await setUserOpenRouterKey(user.id, key, info.label);
	} catch (error) {
		if (error instanceof OpenRouterError && error.status === 401) {
			return { ok: false, error: "That key was rejected by OpenRouter" };
		}
		console.error(
			"[ai-settings] Saving OpenRouter key failed",
			error instanceof Error ? error.message : "Unknown error",
		);
		return {
			ok: false,
			error: "Could not check that key with OpenRouter. Try again.",
		};
	}

	revalidatePath(SETTINGS_PATH);
	return { ok: true };
}

export async function removeOpenRouterKey(): Promise<AiSettingsResult> {
	const user = await getCurrentUser();
	if (!user) return { ok: false, error: "You need to sign in" };

	await clearUserOpenRouterKey(user.id);
	revalidatePath(SETTINGS_PATH);
	return { ok: true };
}

export async function updateAiPreferences(patch: {
	transcriptionModel?: string | null;
	summaryModel?: string | null;
	zeroDataRetention?: boolean;
}): Promise<AiSettingsResult> {
	const user = await getCurrentUser();
	if (!user) return { ok: false, error: "You need to sign in" };

	const next: Parameters<typeof updateUserAiPreferences>[1] = {};

	if (patch.transcriptionModel !== undefined) {
		if (
			patch.transcriptionModel !== null &&
			!isSupportedTranscriptionModel(patch.transcriptionModel)
		) {
			return { ok: false, error: "That transcription model is not supported" };
		}
		next.transcriptionModel = patch.transcriptionModel;
	}
	if (patch.summaryModel !== undefined) {
		if (
			patch.summaryModel !== null &&
			!(await isAvailableSummaryModel(patch.summaryModel))
		) {
			return { ok: false, error: "That summary model is not available" };
		}
		next.summaryModel = patch.summaryModel;
	}
	if (patch.zeroDataRetention !== undefined) {
		next.zeroDataRetention = Boolean(patch.zeroDataRetention);
	}

	await updateUserAiPreferences(user.id, next);
	revalidatePath(SETTINGS_PATH);
	return { ok: true };
}

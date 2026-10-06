import { db } from "@cap/database";
import { decrypt, encrypt } from "@cap/database/crypto";
import { userAiSettings } from "@cap/database/schema";
import { serverEnv } from "@cap/env";
import { eq } from "drizzle-orm";
import { isAiConfigured } from "@/lib/ai/provider";
import {
	DEFAULT_SUMMARY_MODEL,
	DEFAULT_TRANSCRIPTION_MODEL,
} from "@/lib/openrouter/catalog";

export type UserAiSettings = {
	hasKey: boolean;
	keyLabel: string | null;
	transcriptionModel: string | null;
	summaryModel: string | null;
	zeroDataRetention: boolean;
};

export type ByokModelAccess = {
	apiKey: string;
	model: string;
	zeroDataRetention: boolean;
};

async function getRow(userId: string) {
	const [row] = await db()
		.select()
		.from(userAiSettings)
		.where(eq(userAiSettings.userId, userId as never))
		.limit(1);
	return row ?? null;
}

export async function getUserAiSettings(
	userId: string,
): Promise<UserAiSettings> {
	const row = await getRow(userId);
	return {
		hasKey: Boolean(row?.openRouterKey),
		keyLabel: row?.openRouterKeyLabel ?? null,
		transcriptionModel: row?.transcriptionModel ?? null,
		summaryModel: row?.summaryModel ?? null,
		zeroDataRetention: row?.zeroDataRetention ?? false,
	};
}

export async function setUserOpenRouterKey(
	userId: string,
	key: string,
	label: string,
): Promise<void> {
	const encryptedKey = await encrypt(key);
	const keyLabel = label.slice(0, 64);
	const existing = await getRow(userId);

	if (!existing) {
		await db()
			.insert(userAiSettings)
			.values({
				userId: userId as never,
				openRouterKey: encryptedKey,
				openRouterKeyLabel: keyLabel,
				transcriptionModel: DEFAULT_TRANSCRIPTION_MODEL,
				summaryModel: DEFAULT_SUMMARY_MODEL,
			});
		return;
	}

	// First-time setup (no model choice yet) gets sensible defaults; a
	// returning user keeps whatever they picked, including Off.
	const hadNoModels =
		existing.transcriptionModel === null && existing.summaryModel === null;
	await db()
		.update(userAiSettings)
		.set({
			openRouterKey: encryptedKey,
			openRouterKeyLabel: keyLabel,
			...(hadNoModels && !existing.openRouterKey
				? {
						transcriptionModel: DEFAULT_TRANSCRIPTION_MODEL,
						summaryModel: DEFAULT_SUMMARY_MODEL,
					}
				: {}),
		})
		.where(eq(userAiSettings.userId, userId as never));
}

export async function clearUserOpenRouterKey(userId: string): Promise<void> {
	await db()
		.update(userAiSettings)
		.set({ openRouterKey: null, openRouterKeyLabel: null })
		.where(eq(userAiSettings.userId, userId as never));
}

export async function updateUserAiPreferences(
	userId: string,
	patch: {
		transcriptionModel?: string | null;
		summaryModel?: string | null;
		zeroDataRetention?: boolean;
	},
): Promise<void> {
	const set = {
		...(patch.transcriptionModel !== undefined
			? { transcriptionModel: patch.transcriptionModel }
			: {}),
		...(patch.summaryModel !== undefined
			? { summaryModel: patch.summaryModel }
			: {}),
		...(patch.zeroDataRetention !== undefined
			? { zeroDataRetention: patch.zeroDataRetention }
			: {}),
	};
	if (Object.keys(set).length === 0) return;

	await db()
		.insert(userAiSettings)
		.values({ userId: userId as never, ...set })
		.onDuplicateKeyUpdate({ set });
}

async function getByokAccess(
	userId: string,
	pick: "transcriptionModel" | "summaryModel",
): Promise<ByokModelAccess | null> {
	if (!userId) return null;
	const row = await getRow(userId);
	const model = row?.[pick];
	if (!row?.openRouterKey || !model) return null;
	try {
		return {
			apiKey: await decrypt(row.openRouterKey),
			model,
			zeroDataRetention: row.zeroDataRetention,
		};
	} catch (error) {
		console.error("[byok] Failed to decrypt OpenRouter key", {
			userId,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

export async function getByokTranscription(
	userId: string,
): Promise<ByokModelAccess | null> {
	return getByokAccess(userId, "transcriptionModel");
}

export async function getByokGeneration(
	userId: string,
): Promise<ByokModelAccess | null> {
	return getByokAccess(userId, "summaryModel");
}

export async function isTranscriptionAvailable(
	ownerId: string,
): Promise<boolean> {
	if (serverEnv().ASSEMBLY_API_KEY) return true;
	return (await getByokTranscription(ownerId)) !== null;
}

export async function isAiConfiguredForUser(
	role: "generation" | "chat" | "chat-streaming",
	userId?: string | null,
): Promise<boolean> {
	if (isAiConfigured(role)) return true;
	if (!userId) return false;
	return (await getByokGeneration(userId)) !== null;
}

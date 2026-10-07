import { getCurrentUser } from "@cap/database/auth/session";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
	getByokGeneration,
	getByokTranscription,
	getUserAiSettings,
} from "@/lib/ai/byok";
import {
	getSummaryModelOptions,
	getTranscriptionModelOptions,
} from "@/lib/openrouter/catalog";
import { verifyOpenRouterKey } from "@/lib/openrouter/client";
import { AiSettings } from "./AiSettings";

export const metadata: Metadata = {
	title: "AI & transcription — Screencap",
};

export default async function AiSettingsPage() {
	const user = await getCurrentUser();
	if (!user) redirect("/login");

	const [settings, transcriptionOptions, summaryOptions] = await Promise.all([
		getUserAiSettings(user.id),
		getTranscriptionModelOptions(),
		getSummaryModelOptions(),
	]);

	let usage: { usageUsd: number } | null = null;
	if (settings.hasKey) {
		// The decrypted key stays on the server; only the spend number reaches the client.
		const access =
			(await getByokTranscription(user.id).catch(() => null)) ??
			(await getByokGeneration(user.id).catch(() => null));
		if (access) {
			usage = await verifyOpenRouterKey(access.apiKey)
				.then((info) => ({ usageUsd: info.usageUsd }))
				.catch(() => null);
		}
	}

	return (
		<AiSettings
			settings={settings}
			transcriptionOptions={transcriptionOptions}
			summaryOptions={summaryOptions}
			usage={usage}
		/>
	);
}

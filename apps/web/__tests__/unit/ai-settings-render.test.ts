import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
	usePathname: () => "/dashboard/settings/ai",
}));
vi.mock("@/actions/ai-settings", () => ({
	saveOpenRouterKey: vi.fn(),
	removeOpenRouterKey: vi.fn(),
	updateAiPreferences: vi.fn(),
}));

import { AiSettings } from "@/app/(org)/dashboard/settings/ai/AiSettings";

const transcriptionOptions = [
	{
		id: "openai/whisper-large-v3-turbo",
		name: "Whisper Large v3 Turbo",
		perHourUsd: 0.04,
		perHourLabel: "4¢ an hour",
		note: "Fastest, very cheap",
		recommended: true,
	},
];
const summaryOptions = [
	{
		id: "google/gemini-3.5-flash-lite",
		name: "Google: Gemini 3.5 Flash Lite",
		perHourUsd: 0.02,
		perHourLabel: "2¢ an hour",
		recommended: true,
	},
];

// Server-renders the client component so runtime errors (e.g. a Radix Slot
// given several children) fail here instead of in production.
describe("AiSettings render", () => {
	it("renders without a key", () => {
		const html = renderToStaticMarkup(
			createElement(AiSettings, {
				settings: {
					hasKey: false,
					keyLabel: null,
					transcriptionModel: null,
					summaryModel: null,
					zeroDataRetention: false,
				},
				transcriptionOptions,
				summaryOptions,
				usage: null,
			}),
		);
		expect(html).toContain("Connect OpenRouter");
		expect(html).toContain('href="/api/integrations/openrouter/start"');
		expect(html).toContain("4¢ an hour");
	});

	it("renders with a key and models chosen", () => {
		const html = renderToStaticMarkup(
			createElement(AiSettings, {
				settings: {
					hasKey: true,
					keyLabel: "sk-or-v1-348...6cf",
					transcriptionModel: "openai/whisper-large-v3-turbo",
					summaryModel: "google/gemini-3.5-flash-lite",
					zeroDataRetention: true,
				},
				transcriptionOptions,
				summaryOptions,
				usage: { usageUsd: 0.004 },
			}),
		);
		expect(html).toContain("sk-or-v1-348...6cf");
		expect(html).toContain("2¢ an hour");
	});
});

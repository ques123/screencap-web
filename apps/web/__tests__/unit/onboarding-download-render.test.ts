import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
	usePathname: () => "/onboarding/download",
}));
vi.mock("@cap/env", () => ({
	buildEnv: { NEXT_PUBLIC_IS_CAP: undefined },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/lib/EffectRuntime", () => ({
	useRpcClient: () => ({ UserCompleteOnboardingStep: vi.fn() }),
	useEffectMutation: () => ({
		mutate: vi.fn(),
		isPending: false,
		isSuccess: false,
	}),
}));
vi.mock("hooks/useDetectPlatform", () => ({
	useDetectPlatform: () => ({ platform: "macos", isIntel: true }),
}));

import { DownloadPage } from "@/app/(org)/onboarding/components/DownloadPage";
import {
	allOnboardingSteps,
	getOnboardingSteps,
} from "@/app/(org)/onboarding/steps";

describe("onboarding DownloadPage render", () => {
	it("renders both Mac downloads with no prices", () => {
		const html = renderToStaticMarkup(createElement(DownloadPage));
		expect(html).toContain('href="/download/apple-silicon"');
		expect(html).toContain('href="/download/apple-intel"');
		expect(html).toContain("Recommended for your Mac");
		expect(html).toContain("Continue");
		expect(html).not.toContain("$");
		expect(html).not.toMatch(/\bPro\b/);
	});
});

describe("onboarding step filtering", () => {
	it("hides custom-domain and invite-team when not Cap", () => {
		expect(getOnboardingSteps(false)).toEqual([
			"welcome",
			"organization-setup",
			"download",
		]);
	});
	it("keeps every step on Cap builds", () => {
		expect(getOnboardingSteps(true)).toEqual([...allOnboardingSteps]);
	});
});

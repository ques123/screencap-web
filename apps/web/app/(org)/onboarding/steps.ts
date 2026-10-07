export const allOnboardingSteps = [
	"welcome",
	"organization-setup",
	"custom-domain",
	"invite-team",
	"download",
] as const;

export type OnboardingStep = (typeof allOnboardingSteps)[number];

/**
 * Steps shown for this build. custom-domain is a Pro upsell and invite-team is a
 * seat checkout; neither applies to Screencap, so both only show on Cap builds.
 */
export function getOnboardingSteps(isCap: boolean): OnboardingStep[] {
	return allOnboardingSteps.filter(
		(s) => isCap || (s !== "custom-domain" && s !== "invite-team"),
	);
}

import { buildEnv } from "@cap/env";
import { getCurrentUser } from "@cap/database/auth/session";
import { redirect } from "next/navigation";

export default async function OnboardingStepLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ steps: string[] }>;
}) {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/login");
	}

	const steps = user.onboardingSteps || {};
	const currentStep = (await params).steps?.[0] ?? "welcome";

	const allSteps = [
		"welcome",
		"organization-setup",
		"custom-domain",
		"invite-team",
		"download",
	] as const;
	// The custom-domain step is a Pro upsell that does nothing on self-hosted builds.
	const ordered = allSteps.filter(
		(s) => s !== "custom-domain" || buildEnv.NEXT_PUBLIC_IS_CAP === "true",
	);
	const isComplete = (s: (typeof allSteps)[number]) =>
		s === "welcome"
			? Boolean(steps.welcome && user.name)
			: s === "organization-setup"
				? Boolean(steps.organizationSetup)
				: s === "custom-domain"
					? Boolean(steps.customDomain)
					: s === "invite-team"
						? Boolean(steps.inviteTeam)
						: Boolean(steps.download);

	const firstIncomplete = ordered.find((s) => !isComplete(s)) ?? "download";

	if (currentStep !== firstIncomplete) {
		redirect(`/onboarding/${firstIncomplete}`);
	}

	return children;
}

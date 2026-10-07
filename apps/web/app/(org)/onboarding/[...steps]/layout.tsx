import { buildEnv } from "@cap/env";
import { getCurrentUser } from "@cap/database/auth/session";
import { redirect } from "next/navigation";
import { getOnboardingSteps, type OnboardingStep } from "../steps";

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

	const ordered = getOnboardingSteps(buildEnv.NEXT_PUBLIC_IS_CAP === "true");
	const isComplete = (s: OnboardingStep) =>
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

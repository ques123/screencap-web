import { getCurrentUser } from "@cap/database/auth/session";
import { redirect } from "next/navigation";
import Bottom from "./components/Bottom";
import Stepper from "./components/Stepper";

export default async function OnboardingLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const user = await getCurrentUser();
	// Signed out (or the sign-in never finished): every step would fail with a generic error,
	// so send people back to sign in and return them here afterwards.
	if (!user) redirect("/login?next=/onboarding");
	const completedSteps = user?.onboardingSteps || {};

	return (
		<div className="flex isolate relative flex-col justify-center items-center px-5 py-10 w-full custom-scroll min-h-fit lg:min-h-auto h-dvh bg-gray-1">
			<Stepper completedSteps={completedSteps} />
			{children}
			<Bottom />
		</div>
	);
}

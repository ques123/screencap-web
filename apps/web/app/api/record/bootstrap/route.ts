import { getCurrentUser } from "@cap/database/auth/session";
import { userIsPro } from "@cap/utils";
import {
	resolveRecordingOrganisationId,
	skipOnboardingForGuest,
} from "@/lib/guest-bootstrap";
import type { GuestBootstrap } from "@/lib/guest-record";
import { maxRecordingSecondsFor } from "@/lib/screencap-limits";

// Called by /record right after a guest verifies their email: who they are, where to record, and
// their recording limit. Per-user, so never cached.
export const dynamic = "force-dynamic";

const NO_STORE = { "cache-control": "no-store" };

export async function GET() {
	const user = await getCurrentUser();
	if (!user) {
		return Response.json(
			{ error: "Not signed in" },
			{ status: 401, headers: NO_STORE },
		);
	}

	await skipOnboardingForGuest({
		id: String(user.id),
		email: user.email,
		name: user.name,
		onboardingSteps: user.onboardingSteps ?? null,
	});

	const body: GuestBootstrap = {
		userId: String(user.id),
		email: user.email,
		organisationId: await resolveRecordingOrganisationId({
			id: String(user.id),
			activeOrganizationId: user.activeOrganizationId
				? String(user.activeOrganizationId)
				: null,
		}),
		isPro: userIsPro(user),
		maxRecordingSeconds: await maxRecordingSecondsFor(String(user.id)),
	};
	return Response.json(body, { headers: NO_STORE });
}

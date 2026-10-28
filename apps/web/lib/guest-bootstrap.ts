import { db } from "@cap/database";
import { nanoId } from "@cap/database/helpers";
import {
	organizationMembers,
	organizations,
	users,
} from "@cap/database/schema";
import { Organisation, type User } from "@cap/web-domain";
import { and, eq, isNull } from "drizzle-orm";

/**
 * The organisation a signed-in user records into. Same rule as the dashboard: their active
 * organisation if they still belong to it, else the first they belong to. New accounts get
 * "My Organization" when the auth adapter creates the user; the only accounts without one are
 * invited or SSO users who have not accepted yet, so create one here rather than fail.
 */
export async function resolveRecordingOrganisationId(user: {
	id: string;
	activeOrganizationId: string | null;
}): Promise<string> {
	const userId = user.id as User.UserId;
	const [owned, member] = await Promise.all([
		db()
			.select({ id: organizations.id })
			.from(organizations)
			.where(
				and(
					eq(organizations.ownerId, userId),
					isNull(organizations.tombstoneAt),
				),
			),
		db()
			.select({ id: organizations.id })
			.from(organizationMembers)
			.innerJoin(
				organizations,
				eq(organizations.id, organizationMembers.organizationId),
			)
			.where(
				and(
					eq(organizationMembers.userId, userId),
					isNull(organizations.tombstoneAt),
				),
			),
	]);
	const ids = [...owned, ...member].map((o) => String(o.id));
	const active = ids.find((id) => id === user.activeOrganizationId);
	if (active) return active;
	if (ids[0]) return ids[0];

	const organizationId = Organisation.OrganisationId.make(nanoId());
	await db().insert(organizations).values({
		id: organizationId,
		ownerId: userId,
		name: "My Organization",
	});
	await db().insert(organizationMembers).values({
		id: nanoId(),
		organizationId,
		userId,
		role: "owner",
	});
	await db()
		.update(users)
		.set({ activeOrganizationId: organizationId, defaultOrgId: organizationId })
		.where(eq(users.id, userId));
	return organizationId;
}

/** A display name from an email address: "john.smith+x@…" → "John Smith", "chris22@…" → "Chris". */
export function nameFromEmail(email: string): string {
	const local = (email.split("@")[0] ?? "").split("+")[0] ?? "";
	const words = local
		.replace(/[0-9]+/g, " ")
		.split(/[._\-\s]+/)
		.filter(Boolean)
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
	return (words.join(" ") || local || "Screencap user").slice(0, 255);
}

/**
 * People who sign up from /record skip the setup wizard (name, organisation, download): the dashboard
 * sends anyone without a name to /onboarding/welcome, so give them one from their email and mark the
 * steps done. They can change the name in settings. Leaves accounts that already have a name alone.
 */
export async function skipOnboardingForGuest(user: {
	id: string;
	email: string;
	name: string | null;
	onboardingSteps: Record<string, boolean | undefined> | null;
}) {
	if (user.name) return;
	await db()
		.update(users)
		.set({
			name: nameFromEmail(user.email),
			onboardingSteps: {
				...(user.onboardingSteps ?? {}),
				welcome: true,
				organizationSetup: true,
				customDomain: true,
				inviteTeam: true,
				download: true,
			},
			onboarding_completed_at: new Date(),
		})
		.where(eq(users.id, user.id as User.UserId));
}

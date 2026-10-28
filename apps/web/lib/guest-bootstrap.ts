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

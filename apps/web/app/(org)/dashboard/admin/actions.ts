"use server";

import { revalidatePath } from "next/cache";
import type { ScreencapSettings } from "@/lib/screencap-admin";
import {
	blockUser,
	deleteAccount,
	purgeDue,
	removeRecording,
	requireAdmin,
	resolveOpenReportsForVideo,
	resolveReport,
	restoreRecording,
	setProRevoked,
	setRecordingPublic,
	setUserOverrides,
	signOutEverywhere,
	unblockUser,
	updateSettings,
} from "@/lib/screencap-admin";
import type { ActionResult } from "@/lib/screencap-admin/types";
import { sendTestEmailTo } from "./test-email";

export type DestructiveInput = {
	reason?: string;
	source?: "report" | "own";
	notify?: boolean;
};

const BASE = "/dashboard/admin";

function refresh(...paths: string[]) {
	for (const p of paths) revalidatePath(`${BASE}${p}`);
	revalidatePath(BASE, "layout");
}

function clean(input: DestructiveInput): DestructiveInput {
	return {
		reason: input.reason?.trim() || undefined,
		source: input.source === "report" ? "report" : "own",
		notify: Boolean(input.notify),
	};
}

function needReason(input: DestructiveInput): ActionResult | null {
	return input.reason ? null : { ok: false, error: "A reason is required." };
}

/* Recordings */

export async function removeRecordingAction(
	videoId: string,
	input: DestructiveInput & { quarantine?: boolean },
): Promise<ActionResult> {
	const admin = await requireAdmin();
	const i = clean(input);
	const bad = needReason(i);
	if (bad) return bad;
	const result = await removeRecording(videoId, {
		adminEmail: admin.email,
		...i,
		quarantine: Boolean(input.quarantine),
	});
	refresh("/recordings", "/removed", "/reports", "/users");
	return result;
}

export async function restoreRecordingAction(
	videoId: string,
	opts: { force?: boolean; confirm?: string } = {},
): Promise<ActionResult> {
	const admin = await requireAdmin();
	// Restoring quarantined content needs the recording id typed back.
	const force = opts.force === true && opts.confirm?.trim() === videoId;
	const result = await restoreRecording(videoId, admin.email, { force });
	refresh("/recordings", "/removed", "/users");
	return result;
}

export async function setRecordingPublicAction(
	videoId: string,
	isPublic: boolean,
): Promise<ActionResult> {
	const admin = await requireAdmin();
	const result = await setRecordingPublic(videoId, isPublic, admin.email);
	refresh("/recordings", "/users");
	return result;
}

export async function purgeDueNowAction(): Promise<ActionResult> {
	const admin = await requireAdmin();
	void admin;
	try {
		const r = await purgeDue();
		refresh("/removed");
		if (r.failed.length > 0) {
			return {
				ok: false,
				error: `Purged ${r.purged.length}, ${r.failed.length} failed: ${r.failed[0]?.error ?? ""}`,
			};
		}
		return {
			ok: true,
			message:
				r.purged.length === 0
					? "Nothing was due for purging."
					: `Purged ${r.purged.length} recording${r.purged.length === 1 ? "" : "s"}.`,
		};
	} catch (e) {
		return {
			ok: false,
			error: e instanceof Error ? e.message : "Purge failed",
		};
	}
}

/* Users */

export async function blockUserAction(
	userId: string,
	input: DestructiveInput,
): Promise<ActionResult> {
	const admin = await requireAdmin();
	const i = clean(input);
	const bad = needReason(i);
	if (bad) return bad;
	const result = await blockUser(userId, { adminEmail: admin.email, ...i });
	refresh("/users", `/users/${userId}`, "/recordings");
	return result;
}

export async function unblockUserAction(
	userId: string,
	input: Pick<DestructiveInput, "reason" | "source">,
): Promise<ActionResult> {
	const admin = await requireAdmin();
	const i = clean(input);
	const result = await unblockUser(userId, {
		adminEmail: admin.email,
		reason: i.reason,
		source: i.source,
	});
	refresh("/users", `/users/${userId}`);
	return result;
}

export async function signOutEverywhereAction(
	userId: string,
): Promise<ActionResult> {
	const admin = await requireAdmin();
	const result = await signOutEverywhere(userId, admin.email);
	refresh(`/users/${userId}`);
	return result;
}

export async function deleteAccountAction(
	userId: string,
	input: DestructiveInput,
): Promise<ActionResult> {
	const admin = await requireAdmin();
	const i = clean(input);
	const bad = needReason(i);
	if (bad) return bad;
	const result = await deleteAccount(userId, { adminEmail: admin.email, ...i });
	refresh("/users", `/users/${userId}`, "/recordings", "/removed");
	return result;
}

export async function setUserOverridesAction(
	userId: string,
	o: {
		storageHoursOverride: number | null;
		recordingMinutesOverride: number | null;
		note?: string | null;
	},
): Promise<ActionResult> {
	const admin = await requireAdmin();
	const positive = (n: number | null) =>
		n === null || (Number.isFinite(n) && n > 0);
	if (
		!positive(o.storageHoursOverride) ||
		!positive(o.recordingMinutesOverride)
	)
		return { ok: false, error: "Limits must be positive numbers, or empty." };
	const result = await setUserOverrides(userId, o, admin.email);
	refresh(`/users/${userId}`);
	return result;
}

export async function setProRevokedAction(
	userId: string,
	revoked: boolean,
): Promise<ActionResult> {
	const admin = await requireAdmin();
	const result = await setProRevoked(userId, revoked, admin.email);
	refresh(`/users/${userId}`);
	return result;
}

/* Reports */

export async function dismissReportAction(
	id: number,
	note?: string,
): Promise<ActionResult> {
	const admin = await requireAdmin();
	const result = await resolveReport(
		id,
		"dismissed",
		admin.email,
		note?.trim() || undefined,
	);
	refresh("/reports");
	return result;
}

export async function removeFromReportAction(
	reportId: number,
	videoId: string,
	input: DestructiveInput & { quarantine?: boolean },
): Promise<ActionResult> {
	const admin = await requireAdmin();
	const i = clean({ ...input, source: "report" });
	const bad = needReason(i);
	if (bad) return bad;
	const result = await removeRecording(videoId, {
		adminEmail: admin.email,
		...i,
		quarantine: Boolean(input.quarantine),
	});
	// Already removed (e.g. through another report) still settles this report.
	const settled =
		result.ok || /already removed|not found/i.test(result.error ?? "");
	if (settled) {
		await resolveReport(reportId, "actioned", admin.email, i.reason);
		if (result.ok)
			await resolveOpenReportsForVideo(videoId, admin.email, i.reason);
	}
	refresh("/reports", "/recordings", "/removed");
	return settled && !result.ok
		? {
				ok: true,
				message: "That recording was already removed; report closed.",
			}
		: result;
}

export async function blockFromReportAction(
	reportId: number,
	userId: string,
	input: DestructiveInput,
): Promise<ActionResult> {
	const admin = await requireAdmin();
	const i = clean({ ...input, source: "report" });
	const bad = needReason(i);
	if (bad) return bad;
	const result = await blockUser(userId, { adminEmail: admin.email, ...i });
	if (result.ok)
		await resolveReport(reportId, "actioned", admin.email, i.reason);
	refresh("/reports", "/users", `/users/${userId}`);
	return result;
}

/* Settings */

export async function updateSettingsAction(
	patch: Partial<ScreencapSettings>,
): Promise<ActionResult> {
	const admin = await requireAdmin();
	try {
		await updateSettings(patch, admin.email);
		refresh("/settings");
		return {
			ok: true,
			message: "Settings saved. They apply everywhere within 30 seconds.",
		};
	} catch (e) {
		return {
			ok: false,
			error: e instanceof Error ? e.message : "Could not save settings",
		};
	}
}

export async function sendTestEmailAction(): Promise<ActionResult> {
	const admin = await requireAdmin();
	try {
		await sendTestEmailTo(admin.email);
		refresh("", "/settings");
		return {
			ok: true,
			message: `Test email sent to ${admin.email}. Check the Overview page if it does not arrive.`,
		};
	} catch (e) {
		return {
			ok: false,
			error: e instanceof Error ? e.message : "Could not send the test email",
		};
	}
}

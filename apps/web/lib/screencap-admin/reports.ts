import "server-only";
import { db } from "@cap/database";
import { screencapRemovedVideos, screencapReports } from "@cap/database/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { logAdminAction } from "./audit";
import type { ActionResult, AdminReportRow } from "./types";

const clip = (v: string | null, n: number) =>
	v === null ? null : v.slice(0, n);

/** Stores a user report. Never throws. */
export async function createReport(r: {
	videoId: string;
	videoTitle: string | null;
	ownerId: string | null;
	ownerEmail: string | null;
	reason: string;
	details: string | null;
	reporterEmail: string | null;
	country: string;
}): Promise<void> {
	try {
		await db()
			.insert(screencapReports)
			.values({
				videoId: r.videoId.slice(0, 15),
				videoTitle: clip(r.videoTitle, 255),
				ownerId: clip(r.ownerId, 15),
				ownerEmail: clip(r.ownerEmail, 255),
				reason: r.reason.slice(0, 64),
				details: r.details,
				reporterEmail: clip(r.reporterEmail, 255),
				country: r.country.slice(0, 8),
			});
	} catch (error) {
		console.error("[screencap-admin] createReport failed", error);
	}
}

export async function listReports(opts: {
	status?: "open" | "actioned" | "dismissed" | "all";
	limit?: number;
}): Promise<AdminReportRow[]> {
	const status = opts.status ?? "open";
	const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
	const query = db()
		.select({
			report: screencapReports,
			removedState: screencapRemovedVideos.state,
		})
		.from(screencapReports)
		.leftJoin(
			screencapRemovedVideos,
			and(
				eq(screencapRemovedVideos.videoId, sql`${screencapReports.videoId}`),
				inArray(screencapRemovedVideos.state, ["removed", "quarantined"]),
			),
		);
	const rows = await (status === "all"
		? query
		: query.where(eq(screencapReports.status, status))
	)
		.orderBy(desc(screencapReports.id))
		.limit(limit);
	return rows.map(({ report: r, removedState }) => ({
		id: r.id,
		videoId: r.videoId,
		videoTitle: r.videoTitle,
		ownerId: r.ownerId,
		ownerEmail: r.ownerEmail,
		reason: r.reason,
		details: r.details,
		reporterEmail: r.reporterEmail,
		country: r.country,
		status: r.status,
		adminNote: r.adminNote,
		createdAt: r.createdAt,
		resolvedAt: r.resolvedAt,
		resolvedBy: r.resolvedBy,
		recordingRemoved: removedState !== null,
	}));
}

export async function resolveReport(
	id: number,
	status: "actioned" | "dismissed",
	adminEmail: string,
	note?: string,
): Promise<ActionResult> {
	try {
		const [row] = await db()
			.select()
			.from(screencapReports)
			.where(eq(screencapReports.id, id))
			.limit(1);
		if (!row) return { ok: false, error: "Report not found." };
		await db()
			.update(screencapReports)
			.set({
				status,
				adminNote: note?.trim() ? note.trim() : row.adminNote,
				resolvedAt: new Date(),
				resolvedBy: adminEmail,
			})
			.where(eq(screencapReports.id, id));
		await logAdminAction({
			adminEmail,
			action: `report.${status}`,
			targetType: "report",
			targetId: String(id),
			targetLabel: row.videoTitle ?? row.videoId,
			reason: note ?? null,
			details: { videoId: row.videoId },
		});
		return {
			ok: true,
			message:
				status === "actioned"
					? "Report marked as actioned."
					: "Report dismissed.",
		};
	} catch (error) {
		console.error("[screencap-admin] resolveReport failed", error);
		return { ok: false, error: "Could not update the report." };
	}
}

export async function openReportCount(): Promise<number> {
	try {
		const [row] = await db()
			.select({ n: sql<number>`COUNT(*)`.mapWith(Number) })
			.from(screencapReports)
			.where(eq(screencapReports.status, "open"));
		return row?.n ?? 0;
	} catch {
		return 0;
	}
}

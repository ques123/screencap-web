import "server-only";
import { db } from "@cap/database";
import { sendEmail } from "@cap/database/emails/config";
import {
	ScreencapReport,
	type ScreencapReportStage,
	screencapReportSubject,
} from "@cap/database/emails/screencap-report";
import { screencapEmailLog } from "@cap/database/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import {
	createElement,
	type JSXElementConstructor,
	type ReactElement,
} from "react";
import {
	MAX_RECEIPTS_PER_DAY,
	reporterRecipients,
} from "./reporter-recipients";

function shareLink(videoId: string) {
	const base = (
		process.env.WEB_URL ??
		process.env.NEXT_PUBLIC_WEB_URL ??
		"https://screencap.co"
	).replace(/\/$/, "");
	return `${base}/s/${videoId}`;
}

async function send(
	to: string,
	stage: ScreencapReportStage,
	videoId: string,
): Promise<void> {
	try {
		await sendEmail({
			email: to,
			subject: screencapReportSubject(stage),
			replyTo: "abuse@screencap.co",
			react: createElement(ScreencapReport, {
				stage,
				link: shareLink(videoId),
			}) as ReactElement<unknown, string | JSXElementConstructor<unknown>>,
		});
	} catch (error) {
		console.error(`[screencap-admin] reporter ${stage} email failed`, error);
	}
}

/** Confirms a report to the person who sent it. Never throws. Skipped once an address has had its daily share. */
export async function sendReportReceipt(
	to: string,
	videoId: string,
): Promise<void> {
	if (!to.trim()) return;
	try {
		const [row] = await db()
			.select({ n: sql<number>`COUNT(*)`.mapWith(Number) })
			.from(screencapEmailLog)
			.where(
				and(
					eq(screencapEmailLog.toEmail, to.trim()),
					eq(screencapEmailLog.subject, screencapReportSubject("received")),
					gte(screencapEmailLog.at, new Date(Date.now() - 24 * 3600 * 1000)),
				),
			);
		if ((row?.n ?? 0) >= MAX_RECEIPTS_PER_DAY) return;
	} catch {
		// Without the log we cannot count, so do not send (the form must not become a mail cannon).
		return;
	}
	await send(to.trim(), "received", videoId);
}

/** Tells each reporter the outcome. Never throws. */
export async function notifyReporters(
	rows: { reporterEmail: string | null; videoId: string }[],
	outcome: "actioned" | "dismissed",
): Promise<void> {
	for (const r of reporterRecipients(rows))
		await send(r.email, outcome, r.videoId);
}

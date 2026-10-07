import "server-only";
import { db } from "@cap/database";
import { sendEmail } from "@cap/database/emails/config";
import {
	ScreencapRemoval,
	screencapRemovalSubject,
} from "@cap/database/emails/screencap-removal";
import { screencapEmailLog } from "@cap/database/schema";
import { and, desc, eq, gte } from "drizzle-orm";
import {
	createElement,
	type JSXElementConstructor,
	type ReactElement,
} from "react";

/**
 * Sends the statement-of-reasons email. Returns true when the provider accepted it.
 * sendEmail returns void, so "no throw" counts as accepted unless the email log says it failed.
 */
export async function sendRemovalNotice(n: {
	kind: "recording" | "account";
	to: string;
	title?: string | null;
	link?: string | null;
	reason: string;
	source: "report" | "own";
}): Promise<boolean> {
	if (!n.to) return false;
	const subject = screencapRemovalSubject(n.kind);
	const startedAt = new Date(Date.now() - 2000);
	try {
		await sendEmail({
			email: n.to,
			subject,
			replyTo: "email@screencap.co",
			react: createElement(ScreencapRemoval, {
				kind: n.kind,
				email: n.to,
				title: n.title ?? null,
				link: n.link ?? null,
				reason: n.reason,
				source: n.source,
			}) as ReactElement<unknown, string | JSXElementConstructor<unknown>>,
		});
	} catch (error) {
		console.error("[screencap-admin] removal notice failed", error);
		return false;
	}
	try {
		const [last] = await db()
			.select({ ok: screencapEmailLog.ok })
			.from(screencapEmailLog)
			.where(
				and(
					eq(screencapEmailLog.toEmail, n.to),
					eq(screencapEmailLog.subject, subject),
					gte(screencapEmailLog.at, startedAt),
				),
			)
			.orderBy(desc(screencapEmailLog.id))
			.limit(1);
		if (last && !last.ok) return false;
	} catch {
		// The log is advisory; no row means no evidence of failure.
	}
	return true;
}

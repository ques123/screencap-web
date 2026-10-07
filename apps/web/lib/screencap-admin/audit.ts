import "server-only";
import { db } from "@cap/database";
import { screencapAdminLog } from "@cap/database/schema";
import { serverEnv } from "@cap/env";
import { desc, lt } from "drizzle-orm";
import type { AdminLogEntry } from "./types";

export type AdminLogInput = {
	adminEmail: string;
	action: string;
	targetType: "user" | "recording" | "report" | "settings";
	targetId?: string | null;
	targetLabel?: string | null;
	reason?: string | null;
	source?: "report" | "own" | null;
	notified?: boolean;
	details?: Record<string, unknown>;
};

const clip = (v: string | null | undefined, n: number) =>
	v === null || v === undefined ? null : v.slice(0, n);

/** Writes an audit row and throws if the write fails. */
export async function writeAdminLogStrict(e: AdminLogInput): Promise<void> {
	await db()
		.insert(screencapAdminLog)
		.values({
			adminEmail: e.adminEmail.slice(0, 255),
			action: e.action.slice(0, 48),
			targetType: e.targetType,
			targetId: clip(e.targetId, 255),
			targetLabel: clip(e.targetLabel, 255),
			reason: e.reason ?? null,
			source: e.source ?? null,
			notified: e.notified ?? false,
			details: e.details ?? null,
		});
}

/** Writes an audit row. Never throws: a failed log must not undo a completed action. */
export async function logAdminAction(e: AdminLogInput): Promise<void> {
	try {
		await writeAdminLogStrict(e);
	} catch (error) {
		console.error("[screencap-admin] audit log write failed", error);
	}
}

export async function listAdminLog(opts: {
	limit?: number;
	before?: number;
}): Promise<AdminLogEntry[]> {
	const limit = Math.min(Math.max(opts.limit ?? 100, 1), 5000);
	const query = db().select().from(screencapAdminLog);
	const rows = await (opts.before !== undefined
		? query.where(lt(screencapAdminLog.id, opts.before))
		: query
	)
		.orderBy(desc(screencapAdminLog.id))
		.limit(limit);
	return rows.map((r) => ({
		id: r.id,
		at: r.at,
		adminEmail: r.adminEmail,
		action: r.action,
		targetType: r.targetType,
		targetId: r.targetId,
		targetLabel: r.targetLabel,
		reason: r.reason,
		source: r.source,
		notified: r.notified,
		details: r.details ?? null,
	}));
}

function csvCell(value: unknown): string {
	if (value === null || value === undefined) return "";
	let text =
		value instanceof Date
			? value.toISOString()
			: typeof value === "object"
				? JSON.stringify(value)
				: String(value);
	// Stop spreadsheet apps treating cell text as a formula.
	if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
	return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function adminLogToCsv(rows: AdminLogEntry[]): string {
	const header = [
		"id",
		"at",
		"admin",
		"action",
		"target_type",
		"target_id",
		"target_label",
		"reason",
		"source",
		"notified",
		"details",
	];
	const lines = [header.join(",")];
	for (const r of rows)
		lines.push(
			[
				r.id,
				r.at,
				r.adminEmail,
				r.action,
				r.targetType,
				r.targetId,
				r.targetLabel,
				r.reason,
				r.source,
				r.notified,
				r.details,
			]
				.map(csvCell)
				.join(","),
		);
	return `${lines.join("\r\n")}\r\n`;
}

/** Best-effort Telegram message to the ops chat. Never throws. 8 s timeout. */
export async function telegramAlert(text: string): Promise<void> {
	try {
		const env = serverEnv();
		const token = env.TELEGRAM_ALERT_BOT_TOKEN;
		const chatId = env.TELEGRAM_ALERT_CHAT_ID;
		if (!token || !chatId) return;
		const res = await fetch(
			`https://api.telegram.org/bot${token}/sendMessage`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					chat_id: chatId,
					text: text.slice(0, 3900),
					disable_web_page_preview: true,
				}),
				signal: AbortSignal.timeout(8000),
			},
		);
		if (!res.ok)
			console.warn(`[screencap-admin] Telegram responded ${res.status}`);
	} catch (error) {
		console.warn("[screencap-admin] Telegram alert failed", error);
	}
}

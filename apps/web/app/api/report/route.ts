import { db } from "@cap/database";
import { encrypt } from "@cap/database/crypto";
import { users, videos } from "@cap/database/schema";
import { Video } from "@cap/web-domain";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { isE2eeVideo } from "@/lib/e2ee";
import { createReport } from "@/lib/screencap-admin/reports";
import {
	MAX_REPORT_BODY_BYTES,
	REPORT_REASON_LABELS,
	validateReport,
} from "./validation";

export async function POST(request: NextRequest) {
	const declared = Number(request.headers.get("content-length") ?? "0");
	if (declared > MAX_REPORT_BODY_BYTES)
		return Response.json({ error: "Request too large" }, { status: 413 });

	const raw = await request.text();
	if (new TextEncoder().encode(raw).length > MAX_REPORT_BODY_BYTES)
		return Response.json({ error: "Request too large" }, { status: 413 });

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return Response.json({ error: "Invalid request" }, { status: 400 });
	}

	const result = validateReport(parsed);
	if (!result.ok)
		return Response.json({ error: result.error }, { status: 400 });
	const report = result.value;

	const [video] = await db()
		.select({
			id: videos.id,
			name: videos.name,
			ownerId: videos.ownerId,
			ownerEmail: users.email,
			e2ee: videos.e2ee,
		})
		.from(videos)
		.leftJoin(users, eq(users.id, videos.ownerId))
		.where(eq(videos.id, Video.VideoId.make(report.videoId)))
		.limit(1);

	// Same response whether or not the video exists or is private.
	if (!video) return Response.json({ ok: true });

	const country = request.headers.get("cf-ipcountry") ?? "unknown";
	const baseUrl = (
		process.env.WEB_URL ??
		process.env.NEXT_PUBLIC_WEB_URL ??
		""
	).replace(/\/$/, "");
	const shareUrl = `${baseUrl}/s/${video.id}`;
	const reasonLabel = REPORT_REASON_LABELS[report.reason];

	console.log(
		`[report] ${JSON.stringify({
			videoId: video.id,
			reason: report.reason,
			details: report.details,
			email: report.email || null,
			shareUrl,
			ownerId: video.ownerId,
			ownerEmail: video.ownerEmail,
			title: video.name,
			country,
		})}`,
	);

	// Never throws; the report is also logged above and sent to Telegram below.
	let storedKey: string | null = null;
	if (isE2eeVideo(video) && report.decryptionKey) {
		storedKey = await encrypt(report.decryptionKey).catch((error: unknown) => {
			console.error("[report] could not encrypt the reporter's key", error);
			return null;
		});
	}
	await createReport({
		videoId: video.id,
		videoTitle: video.name ?? null,
		ownerId: video.ownerId ?? null,
		ownerEmail: video.ownerEmail ?? null,
		reason: report.reason,
		details: report.details || null,
		reporterEmail: report.email || null,
		country,
		decryptionKey: storedKey,
	});
	const keyIncluded = storedKey !== null;

	const token = process.env.TELEGRAM_ALERT_BOT_TOKEN;
	const chatId = process.env.TELEGRAM_ALERT_CHAT_ID;
	if (!token || !chatId) {
		console.warn("[report] Telegram not configured; report only logged");
		return Response.json({ ok: true });
	}

	const text = [
		"Abuse report",
		`Reason: ${reasonLabel}`,
		`Details: ${report.details || "(none)"}`,
		`Reporter email: ${report.email || "(none)"}`,
		`Reporter country: ${country}`,
		`Key included: ${keyIncluded ? "yes" : "no"}`,
		`URL: ${shareUrl}`,
		`Title: ${video.name}`,
		`Owner: ${video.ownerId} ${video.ownerEmail ?? ""}`.trim(),
		"Review: https://screencap.co/dashboard/admin/reports",
	].join("\n");

	try {
		const res = await fetch(
			`https://api.telegram.org/bot${token}/sendMessage`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					chat_id: chatId,
					text: text.slice(0, 4000),
					disable_web_page_preview: true,
				}),
				signal: AbortSignal.timeout(8000),
			},
		);
		if (!res.ok) console.warn(`[report] Telegram responded ${res.status}`);
	} catch (error) {
		console.warn("[report] Telegram send failed", error);
	}

	return Response.json({ ok: true });
}

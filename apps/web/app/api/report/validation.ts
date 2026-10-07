import {
	isValidE2eeKey,
	keyFingerprintFromText,
	scrubKeyTokens,
} from "@/lib/e2ee";

export const REPORT_REASONS = [
	"illegal",
	"copyright",
	"harassment",
	"spam",
	"other",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
	illegal: "Illegal content",
	copyright: "Copyright infringement",
	harassment: "Harassment or hate",
	spam: "Spam or scam",
	other: "Other",
};

export const MAX_REPORT_BODY_BYTES = 10 * 1024;
export const MAX_DETAILS_LENGTH = 2000;
const MAX_EMAIL_LENGTH = 254;

export interface ValidReport {
	videoId: string;
	reason: ReportReason;
	details: string;
	email: string;
	decryptionKey: string;
}

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateReport(
	input: unknown,
): { ok: true; value: ValidReport } | { ok: false; error: string } {
	if (typeof input !== "object" || input === null || Array.isArray(input))
		return { ok: false, error: "Invalid request" };
	const body = input as Record<string, unknown>;

	if (typeof body.videoId !== "string" || !VIDEO_ID_PATTERN.test(body.videoId))
		return { ok: false, error: "Invalid video" };

	if (
		typeof body.reason !== "string" ||
		!(REPORT_REASONS as readonly string[]).includes(body.reason)
	)
		return { ok: false, error: "Choose a reason" };

	const details = body.details ?? "";
	if (typeof details !== "string" || details.length > MAX_DETAILS_LENGTH)
		return { ok: false, error: "Details are too long" };

	const email = typeof body.email === "string" ? body.email.trim() : "";
	if (body.email != null && typeof body.email !== "string")
		return { ok: false, error: "Invalid email" };
	if (email && (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)))
		return { ok: false, error: "Invalid email" };

	let decryptionKey = "";
	if (body.decryptionKey !== undefined && body.decryptionKey !== null) {
		if (body.decryptionKey !== "" && !isValidE2eeKey(body.decryptionKey))
			return { ok: false, error: "Invalid decryption key" };
		decryptionKey = body.decryptionKey;
	}

	return {
		ok: true,
		value: {
			videoId: body.videoId,
			reason: body.reason as ReportReason,
			details: details.trim(),
			email,
			decryptionKey,
		},
	};
}

export function resolveReportKey(
	report: Pick<ValidReport, "details" | "email" | "decryptionKey">,
	videoFingerprint: string | null | undefined,
): { details: string; email: string; decryptionKey: string | null } {
	const details = scrubKeyTokens(report.details, videoFingerprint);
	const email = scrubKeyTokens(report.email, videoFingerprint);
	const supplied =
		report.decryptionKey &&
		videoFingerprint &&
		keyFingerprintFromText(report.decryptionKey) === videoFingerprint
			? report.decryptionKey
			: null;
	return {
		details: details.text,
		email: email.text,
		decryptionKey: supplied ?? details.matchingKey ?? email.matchingKey,
	};
}

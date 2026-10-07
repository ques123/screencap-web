export const E2EE_FINGERPRINT_PATTERN = /^[0-9a-f]{32}$/;
export const E2EE_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const CANONICAL_KEY_LAST_CHARS = "AEIMQUYcgkosw048";
export const E2EE_MIN_OBJECT_BYTES = 48;

export function isE2eeVideo(
	video: { e2ee?: number | boolean | null } | null | undefined,
): boolean {
	return video?.e2ee === 1 || video?.e2ee === true;
}

export function isValidE2eeKey(value: unknown): value is string {
	if (typeof value !== "string" || !E2EE_KEY_PATTERN.test(value)) return false;
	return CANONICAL_KEY_LAST_CHARS.includes(value.charAt(42));
}

export function isValidE2eeFingerprint(value: unknown): value is string {
	return typeof value === "string" && E2EE_FINGERPRINT_PATTERN.test(value);
}

export function logE2eeSkip(context: string, videoId: string) {
	console.log(`[${context}] skipped: e2ee`, { videoId });
}

export const E2EE_UNSUPPORTED_MESSAGE =
	"This recording is end-to-end encrypted, so this action is not available.";

export type E2eeCreateParams = {
	e2ee?: string | number | boolean | null;
	keyFingerprint?: string | null;
	recordingMode?: string | null;
};

export type E2eeCreateResult =
	| { ok: true; e2ee: boolean; keyFingerprint: string | null }
	| { ok: false; error: string };

export function parseE2eeCreateParams(
	params: E2eeCreateParams,
): E2eeCreateResult {
	const flagGiven = params.e2ee !== undefined && params.e2ee !== null;
	const fingerprintGiven =
		params.keyFingerprint !== undefined && params.keyFingerprint !== null;
	if (!flagGiven && !fingerprintGiven)
		return { ok: true, e2ee: false, keyFingerprint: null };
	if (!flagGiven || !fingerprintGiven)
		return { ok: false, error: "e2ee_requires_fingerprint" };
	const flag = String(params.e2ee);
	if (flag !== "1" && flag !== "true")
		return { ok: false, error: "invalid_e2ee" };
	if (!isValidE2eeFingerprint(params.keyFingerprint))
		return { ok: false, error: "invalid_key_fingerprint" };
	if (params.recordingMode !== "desktopSegments")
		return { ok: false, error: "e2ee_requires_segments" };
	return { ok: true, e2ee: true, keyFingerprint: params.keyFingerprint };
}

import {
	RECORDING_SPOOL_LIVE_MIN_IDLE_MS,
	type RecordingSpoolSessionRecord,
} from "@cap/recorder-core/recording-spool";

// Guest recordings (the public /record page) keep their spool session id behind this prefix so a
// signed-out visitor's recovery scan never picks up a dashboard user's spools.
export const GUEST_SPOOL_PREFIX = "guest-";
export const GUEST_META_KEY = "screencap-guest-recording";

export type GuestRecordingMeta = {
	sessionId: string;
	durationSeconds: number;
	width?: number;
	height?: number;
	/** Set once Stop finished, so a reload right after Stop can still recover the recording. */
	finished: boolean;
};

export const createGuestSpoolSessionId = () =>
	`${GUEST_SPOOL_PREFIX}${crypto.randomUUID()}`;

export const isGuestSpoolSessionId = (sessionId: string) =>
	sessionId.startsWith(GUEST_SPOOL_PREFIX);

export const readGuestRecordingMeta = (): GuestRecordingMeta | null => {
	try {
		const raw = window.localStorage.getItem(GUEST_META_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<GuestRecordingMeta>;
		if (typeof parsed.sessionId !== "string") return null;
		return {
			sessionId: parsed.sessionId,
			durationSeconds:
				typeof parsed.durationSeconds === "number" ? parsed.durationSeconds : 1,
			width: typeof parsed.width === "number" ? parsed.width : undefined,
			height: typeof parsed.height === "number" ? parsed.height : undefined,
			finished: parsed.finished === true,
		};
	} catch {
		return null;
	}
};

export const writeGuestRecordingMeta = (meta: GuestRecordingMeta) => {
	try {
		window.localStorage.setItem(GUEST_META_KEY, JSON.stringify(meta));
	} catch {
		// storage can be unavailable; the spool alone still allows a download
	}
};

export const clearGuestRecordingMeta = () => {
	try {
		window.localStorage.removeItem(GUEST_META_KEY);
	} catch {
		// ignore
	}
};

/**
 * Picks the guest spool worth offering after a reload: the newest guest spool that either was
 * finished by Stop, or has been idle long enough that no other tab can still be recording into it.
 */
export const pickRecoverableGuestSpool = (
	spools: RecordingSpoolSessionRecord[],
	meta: GuestRecordingMeta | null,
	now: number = Date.now(),
): RecordingSpoolSessionRecord | null => {
	const candidates = spools
		.filter(
			(spool) => isGuestSpoolSessionId(spool.sessionId) && spool.totalBytes > 0,
		)
		.filter(
			(spool) =>
				(meta?.finished === true && meta.sessionId === spool.sessionId) ||
				now - spool.updatedAt >= RECORDING_SPOOL_LIVE_MIN_IDLE_MS,
		)
		.sort((a, b) => b.updatedAt - a.updatedAt);
	return candidates[0] ?? null;
};

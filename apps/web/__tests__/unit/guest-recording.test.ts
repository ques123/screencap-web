import { selectRecordingPipelineFromSupport } from "@cap/recorder-core/recorder-utils";
import { describe, expect, it } from "vitest";
import {
	GUEST_SPOOL_PREFIX,
	pickRecoverableGuestSpool,
} from "@/app/(org)/dashboard/caps/components/web-recorder-dialog/guest-recording";

const session = (sessionId: string, updatedAt: number, totalBytes = 10) => ({
	sessionId,
	mimeType: "video/webm",
	totalBytes,
	chunkCount: 1,
	createdAt: updatedAt,
	updatedAt,
});

describe("guest pipeline forcing", () => {
	const all = () => true;
	it("uses streaming WebM on Chromium by default", () => {
		expect(selectRecordingPipelineFromSupport(true, all)?.mode).toBe(
			"streaming-webm",
		);
	});
	it("forces the buffered pipeline, keeping WebM, for guests", () => {
		const pipeline = selectRecordingPipelineFromSupport(true, all, {
			forceBuffered: true,
			preferStreamingUpload: true,
		});
		expect(pipeline?.mode).toBe("buffered-raw");
		expect(pipeline?.fileExtension).toBe("webm");
		expect(pipeline?.supportsProgressiveUpload).toBe(false);
	});
	it("falls back to mp4 when WebM is unavailable", () => {
		const pipeline = selectRecordingPipelineFromSupport(
			true,
			(m) => m.includes("mp4"),
			{ forceBuffered: true },
		);
		expect(pipeline?.mode).toBe("buffered-raw");
		expect(pipeline?.fileExtension).toBe("mp4");
	});
});

describe("pickRecoverableGuestSpool", () => {
	const now = 1_000_000_000;
	const fresh = now - 5_000;
	const old = now - 10 * 60_000;

	it("ignores non-guest spools", () => {
		expect(
			pickRecoverableGuestSpool([session("abc", old)], null, now),
		).toBeNull();
	});
	it("skips a fresh guest spool that was not finished (may be live in another tab)", () => {
		const id = `${GUEST_SPOOL_PREFIX}1`;
		expect(
			pickRecoverableGuestSpool([session(id, fresh)], null, now),
		).toBeNull();
	});
	it("offers a fresh guest spool that Stop finished", () => {
		const id = `${GUEST_SPOOL_PREFIX}1`;
		const meta = { sessionId: id, durationSeconds: 5, finished: true };
		expect(
			pickRecoverableGuestSpool([session(id, fresh)], meta, now)?.sessionId,
		).toBe(id);
	});
	it("offers the newest idle guest spool and skips empty ones", () => {
		const a = `${GUEST_SPOOL_PREFIX}a`;
		const b = `${GUEST_SPOOL_PREFIX}b`;
		const c = `${GUEST_SPOOL_PREFIX}c`;
		const pick = pickRecoverableGuestSpool(
			[session(a, old - 1000), session(b, old), session(c, old + 1000, 0)],
			null,
			now,
		);
		expect(pick?.sessionId).toBe(b);
	});
});

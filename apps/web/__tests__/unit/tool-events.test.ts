import { describe, expect, it } from "vitest";
import {
	createRateLimiter,
	durationBucket,
	isBotUserAgent,
	parseToolEvent,
	sizeBucket,
} from "@/lib/tool-events";

const visitId = "0b6a5c1e-3f7d-4c2a-9a41-1c2d3e4f5a6b";

describe("tool events", () => {
	it("buckets sizes and durations", () => {
		expect(sizeBucket(500)).toBe("<1 MB");
		expect(sizeBucket(5 * 1024 * 1024)).toBe("1-10 MB");
		expect(sizeBucket(2 * 1024 ** 3)).toBe(">1 GB");
		expect(sizeBucket(-1)).toBeNull();
		expect(sizeBucket("5")).toBeNull();
		expect(durationBucket(5)).toBe("<10 s");
		expect(durationBucket(120)).toBe("1-5 min");
	});

	it("validates tool and step", () => {
		expect(parseToolEvent({ tool: "nope", step: "view" })).toBeNull();
		expect(parseToolEvent({ tool: "mp4-to-gif", step: "nope" })).toBeNull();
		expect(parseToolEvent(null)).toBeNull();
	});

	it("keeps only buckets, hosts and trimmed fields", () => {
		const e = parseToolEvent({
			tool: "mov-to-mp4",
			step: "convert_failed",
			visitId,
			fileSizeBytes: 20 * 1024 * 1024,
			errorClass: "x".repeat(200),
			referrer: "https://www.google.com/search?q=secret",
			pageUrl: "https://screencap.co/tools?utm_source=newsletter",
			fileName: "private.mov",
		});
		expect(e).toMatchObject({
			sizeBucket: "10-50 MB",
			referrerHost: "google.com",
			utmSource: "newsletter",
			visitId,
		});
		expect(e?.errorClass).toHaveLength(64);
		expect(JSON.stringify(e)).not.toContain("private");
	});

	it("drops bots and rate limits", () => {
		expect(isBotUserAgent("Googlebot/2.1")).toBe(true);
		expect(isBotUserAgent("Mozilla/5.0 (Macintosh) Chrome/120")).toBe(false);
		const allow = createRateLimiter(2, 1000);
		expect(allow("a", 0)).toBe(true);
		expect(allow("a", 1)).toBe(true);
		expect(allow("a", 2)).toBe(false);
		expect(allow("a", 2000)).toBe(true);
	});
});

import { describe, expect, it } from "vitest";
import {
	avcCodecCandidates,
	calculateBitrate,
	calculateOutputSize,
	createTimelineClock,
	normalizeDelayMs,
} from "@/lib/gif-to-mp4-helpers";

describe("normalizeDelayMs", () => {
	it("treats zero and tiny delays as 100 ms", () => {
		expect(normalizeDelayMs(0)).toBe(100);
		expect(normalizeDelayMs(10)).toBe(100);
		expect(normalizeDelayMs(19)).toBe(100);
		expect(normalizeDelayMs(undefined)).toBe(100);
		expect(normalizeDelayMs(Number.NaN)).toBe(100);
	});

	it("keeps real delays", () => {
		expect(normalizeDelayMs(20)).toBe(20);
		expect(normalizeDelayMs(40)).toBe(40);
		expect(normalizeDelayMs(1500)).toBe(1500);
	});
});

describe("calculateOutputSize", () => {
	it("rounds odd sizes to even", () => {
		expect(calculateOutputSize(321, 181, null)).toEqual({
			width: 322,
			height: 182,
		});
		expect(calculateOutputSize(320, 180, null)).toEqual({
			width: 320,
			height: 180,
		});
	});

	it("caps original at 1920 and scales down only", () => {
		expect(calculateOutputSize(3840, 2160, null)).toEqual({
			width: 1920,
			height: 1080,
		});
		expect(calculateOutputSize(400, 300, 1080)).toEqual({
			width: 400,
			height: 300,
		});
		expect(calculateOutputSize(1000, 501, 480)).toEqual({
			width: 480,
			height: 240,
		});
	});

	it("never returns less than 2", () => {
		expect(calculateOutputSize(1, 1, null)).toEqual({ width: 2, height: 2 });
	});
});

describe("createTimelineClock", () => {
	it("accumulates real durations", () => {
		const clock = createTimelineClock();
		expect(clock.advance(100)).toEqual({ timestamp: 0, duration: 0.1 });
		expect(clock.advance(0)).toEqual({ timestamp: 0.1, duration: 0.1 });
		expect(clock.advance(250)).toEqual({ timestamp: 0.2, duration: 0.25 });
		expect(clock.totalSeconds).toBe(0.45);
	});

	it("continues across repeats", () => {
		const clock = createTimelineClock();
		const delays = [100, 300];
		const stamps: number[] = [];
		for (let pass = 0; pass < 3; pass++) {
			for (const delay of delays) stamps.push(clock.advance(delay).timestamp);
		}
		expect(stamps).toEqual([0, 0.1, 0.4, 0.5, 0.8, 0.9]);
		expect(clock.totalSeconds).toBe(1.2);
	});
});

describe("encoder settings", () => {
	it("clamps bitrate", () => {
		expect(calculateBitrate(100, 100)).toBe(500_000);
		expect(calculateBitrate(1920, 1080)).toBe(6_220_800);
		expect(calculateBitrate(7680, 4320)).toBe(12_000_000);
	});

	it("picks the avc level from the frame size", () => {
		expect(avcCodecCandidates(322, 182)[0]).toBe("avc1.64001e");
		expect(avcCodecCandidates(1280, 720)[0]).toBe("avc1.64001f");
		expect(avcCodecCandidates(1920, 1080)[0]).toBe("avc1.640028");
		expect(avcCodecCandidates(1920, 1080)).toHaveLength(3);
	});
});

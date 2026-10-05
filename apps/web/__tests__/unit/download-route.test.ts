import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET } from "@/app/(site)/download/[platform]/route";

const request = new NextRequest("https://screencap.co/download/apple-silicon");
const base = "https://github.com/ques123/screencap-web/releases/latest/download";

const call = (platform?: string) =>
	GET(request, {
		params: Promise.resolve({ platform } as { platform: string }),
	});

describe("desktop download route", () => {
	it("handles missing route parameters without throwing", async () => {
		const response = await call();
		expect(response.headers.get("location")).toBe(
			"https://screencap.co/download",
		);
	});

	it.each([
		["Apple-Silicon", `${base}/Screencap_aarch64.dmg`],
		["arm64", `${base}/Screencap_aarch64.dmg`],
		["apple-intel", `${base}/Screencap_x64.dmg`],
		["x86_64", `${base}/Screencap_x64.dmg`],
	])("redirects %s to the GitHub release asset", async (platform, url) => {
		const response = await call(platform);
		expect(response.headers.get("location")).toBe(url);
	});

	it.each(["windows", "linux-deb", "linux-rpm", "bogus"])(
		"redirects %s to the unavailable notice",
		async (platform) => {
			const response = await call(platform);
			expect(response.headers.get("location")).toBe(
				"https://screencap.co/download?unavailable=1",
			);
		},
	);
});

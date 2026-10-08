import { describe, expect, it } from "vitest";
import { reporterRecipients } from "@/lib/screencap-admin/reporter-recipients";

describe("reporterRecipients", () => {
	it("skips reports without an email", () => {
		expect(
			reporterRecipients([
				{ reporterEmail: null, videoId: "v1" },
				{ reporterEmail: "  ", videoId: "v1" },
			]),
		).toEqual([]);
	});

	it("sends one email per address and recording, ignoring case", () => {
		expect(
			reporterRecipients([
				{ reporterEmail: "A@x.com", videoId: "v1" },
				{ reporterEmail: "a@x.com ", videoId: "v1" },
				{ reporterEmail: "a@x.com", videoId: "v2" },
				{ reporterEmail: "b@x.com", videoId: "v1" },
			]),
		).toEqual([
			{ email: "A@x.com", videoId: "v1" },
			{ email: "a@x.com", videoId: "v2" },
			{ email: "b@x.com", videoId: "v1" },
		]);
	});
});

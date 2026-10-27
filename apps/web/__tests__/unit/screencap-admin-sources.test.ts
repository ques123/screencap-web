import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@cap/database", () => ({ db: () => ({}) }));

import {
	parseSignupSourceCookie,
	type SignupSourceFields,
} from "@cap/database/screencap-sources";
import { classifySignupSource } from "@/lib/screencap-admin/sources";

const f = (over: Partial<SignupSourceFields>): SignupSourceFields => ({
	referrerHost: null,
	utmSource: null,
	utmMedium: null,
	utmCampaign: null,
	landingPath: "/",
	firstSeenAt: null,
	...over,
});

describe("parseSignupSourceCookie", () => {
	it("reads the encoded cookie the snippet writes", () => {
		const raw = encodeURIComponent(
			JSON.stringify({
				r: "www.Google.com",
				s: "",
				m: "",
				c: "",
				l: "/loom-alternative",
				t: 1_792_000_000,
			}),
		);
		expect(parseSignupSourceCookie(raw)).toEqual({
			referrerHost: "www.google.com",
			utmSource: null,
			utmMedium: null,
			utmCampaign: null,
			landingPath: "/loom-alternative",
			firstSeenAt: new Date(1_792_000_000_000),
		});
	});

	it("gives empty fields for missing or junk values", () => {
		for (const raw of [undefined, "", "%E0%A4%A", "not json", "42", "null"])
			expect(parseSignupSourceCookie(raw).referrerHost).toBeNull();
	});

	it("caps long values", () => {
		const raw = JSON.stringify({ s: "x".repeat(500), l: "/".repeat(500) });
		const out = parseSignupSourceCookie(raw);
		expect(out.utmSource).toHaveLength(100);
		expect(out.landingPath).toHaveLength(255);
	});
});

describe("classifySignupSource", () => {
	it("names AI assistants from utm_source or referrer", () => {
		expect(classifySignupSource(f({ utmSource: "chatgpt.com" }))).toMatchObject(
			{
				label: "ChatGPT",
				kind: "ai",
			},
		);
		expect(
			classifySignupSource(f({ referrerHost: "www.perplexity.ai" })).label,
		).toBe("Perplexity");
		expect(classifySignupSource(f({ referrerHost: "claude.ai" })).label).toBe(
			"Claude",
		);
		expect(
			classifySignupSource(f({ referrerHost: "gemini.google.com" })).label,
		).toBe("Gemini");
	});

	it("tells Google search from other google.com hosts", () => {
		expect(
			classifySignupSource(f({ referrerHost: "www.google.co.uk" })),
		).toMatchObject({
			label: "Google",
			kind: "search",
		});
		expect(
			classifySignupSource(f({ referrerHost: "chromewebstore.google.com" }))
				.label,
		).toBe("Chrome Web Store");
		expect(classifySignupSource(f({ utmSource: "google-ads" })).label).toBe(
			"Google Ads",
		);
	});

	it("flags share-link landings and keeps the referrer as detail", () => {
		expect(
			classifySignupSource(
				f({ landingPath: "/s/abc123", referrerHost: "app.slack.com" }),
			),
		).toMatchObject({
			label: "Share link",
			kind: "share",
			detail: "app.slack.com",
		});
	});

	it("falls back to the raw value, then Direct, then Not tracked", () => {
		expect(
			classifySignupSource(f({ referrerHost: "blog.example.com" })).label,
		).toBe("blog.example.com");
		expect(classifySignupSource(f({ utmSource: "newsletter" })).label).toBe(
			"newsletter",
		);
		expect(classifySignupSource(f({})).label).toBe("Direct");
		expect(classifySignupSource(null)).toMatchObject({
			label: "Not tracked",
			kind: "untracked",
		});
	});
});

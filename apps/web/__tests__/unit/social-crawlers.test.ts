import { describe, expect, it } from "vitest";
import {
	isIframelyCrawlerUserAgent,
	isSocialCrawlerUserAgent,
} from "@/lib/social-crawlers";

describe("social crawler detection", () => {
	it.each([
		"Iframely/1.3.1 (+https://iframely.com/docs/about)",
		"Iframely/2.0.0 (+https://iframely.com/docs/about) Notion",
	])("recognizes Iframely user agent %s", (userAgent) => {
		expect(isSocialCrawlerUserAgent(userAgent)).toBe(true);
		expect(isIframelyCrawlerUserAgent(userAgent)).toBe(true);
	});

	it.each([
		"Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
		"facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
		"Twitterbot/1.0",
		"WhatsApp/2.23.20.0 A",
		"TelegramBot (like TwitterBot)",
		"Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
		"LinkedInBot/1.0 (compatible; Mozilla/5.0)",
		"Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)",
	])("recognizes social crawler %s", (userAgent) => {
		expect(isSocialCrawlerUserAgent(userAgent)).toBe(true);
	});

	it("does not treat a normal browser as a crawler", () => {
		const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";

		expect(isSocialCrawlerUserAgent(userAgent)).toBe(false);
		expect(isIframelyCrawlerUserAgent(userAgent)).toBe(false);
	});
});

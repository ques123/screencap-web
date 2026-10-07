import { isSocialCrawlerUserAgent } from "@/lib/social-crawlers";

const GENERIC_BOT_PATTERN =
	/bot|crawler|spider|crawling|headless|preview|fetch|monitor|uptime|curl|wget|python-requests|httpclient/i;

export function isBotUserAgent(userAgent: string) {
	return (
		isSocialCrawlerUserAgent(userAgent) || GENERIC_BOT_PATTERN.test(userAgent)
	);
}

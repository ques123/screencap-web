import "server-only";
import { db } from "@cap/database";
import { screencapUserSources, users } from "@cap/database/schema";
import type { SignupSourceFields } from "@cap/database/screencap-sources";
import { desc, eq, gte, inArray } from "drizzle-orm";
import type { SignupSource, SignupSourceKind } from "./types";

type UserId = typeof users.$inferSelect.id;

type Rule = [RegExp, string, SignupSourceKind];

// Matched against utm_source first, then the referrer host. Order matters: the Chrome Web Store
// and Gemini live on google.com subdomains, so they come before Google search.
const RULES: Rule[] = [
	[/(^|\.)chatgpt\.com$|(^|\.)openai\.com$|^chatgpt$/, "ChatGPT", "ai"],
	[/(^|\.)perplexity\.ai$|^perplexity$/, "Perplexity", "ai"],
	[/(^|\.)claude\.ai$|^claude$/, "Claude", "ai"],
	[/^gemini\.google\.com$|^bard\.google\.com$|^gemini$/, "Gemini", "ai"],
	[/(^|\.)copilot\.microsoft\.com$|^copilot$/, "Copilot", "ai"],
	[/(^|\.)deepseek\.com$|^deepseek$/, "DeepSeek", "ai"],
	[/(^|\.)grok\.com$|^grok$/, "Grok", "ai"],
	[/(^|\.)phind\.com$|(^|\.)you\.com$|(^|\.)kagi\.com$/, "AI search", "ai"],
	[
		/^chromewebstore\.google\.com$|^chrome\.google\.com$/,
		"Chrome Web Store",
		"store",
	],
	[/^google-ads$/, "Google Ads", "ads"],
	[/^bing-ads$/, "Bing Ads", "ads"],
	[/(^|\.)google\.[a-z.]+$|^google$/, "Google", "search"],
	[/(^|\.)bing\.com$|^bing$/, "Bing", "search"],
	[/(^|\.)duckduckgo\.com$|^duckduckgo$/, "DuckDuckGo", "search"],
	[/^search\.brave\.com$/, "Brave Search", "search"],
	[/(^|\.)ecosia\.org$/, "Ecosia", "search"],
	[/(^|\.)yahoo\.[a-z.]+$/, "Yahoo", "search"],
	[/(^|\.)yandex\.[a-z.]+$/, "Yandex", "search"],
	[/(^|\.)baidu\.com$/, "Baidu", "search"],
	[/(^|\.)naver\.com$/, "Naver", "search"],
	[/^t\.co$|(^|\.)x\.com$|(^|\.)twitter\.com$|^x$|^twitter$/, "X", "social"],
	[/(^|\.)reddit\.com$|^reddit$/, "Reddit", "social"],
	[/^news\.ycombinator\.com$|^hn$|^hackernews$/, "Hacker News", "social"],
	[/(^|\.)linkedin\.com$|^lnkd\.in$|^linkedin$/, "LinkedIn", "social"],
	[/(^|\.)facebook\.com$|^fb\.me$|^facebook$/, "Facebook", "social"],
	[/(^|\.)instagram\.com$|^instagram$/, "Instagram", "social"],
	[/(^|\.)youtube\.com$|^youtu\.be$|^youtube$/, "YouTube", "social"],
	[/(^|\.)tiktok\.com$|^tiktok$/, "TikTok", "social"],
	[/(^|\.)producthunt\.com$|^producthunt$/, "Product Hunt", "social"],
	[/(^|\.)github\.com$|^github$/, "GitHub", "social"],
	[/(^|\.)slack\.com$|^slack$/, "Slack", "social"],
	[/(^|\.)t\.me$|(^|\.)telegram\.org$|^telegram$/, "Telegram", "social"],
	[/(^|\.)discord\.com$|^discord$/, "Discord", "social"],
];

function match(value: string | null): [string, SignupSourceKind] | null {
	if (!value) return null;
	const v = value
		.trim()
		.toLowerCase()
		.replace(/^www\./, "");
	for (const [re, label, kind] of RULES) if (re.test(v)) return [label, kind];
	return null;
}

/** Turns stored attribution fields into a label for the admin panel. null = no row (signed up before tracking). */
export function classifySignupSource(
	fields: SignupSourceFields | null,
): SignupSource {
	if (!fields)
		return { label: "Not tracked", kind: "untracked", detail: null, fields };
	const { referrerHost, utmSource, landingPath } = fields;
	const host = referrerHost?.replace(/^www\./, "") ?? null;
	if (landingPath?.startsWith("/s/"))
		return {
			label: "Share link",
			kind: "share",
			detail: utmSource ?? host,
			fields,
		};
	const known = match(utmSource) ?? match(host);
	if (known) {
		const [label, kind] = known;
		// Keep the raw value when it adds something (e.g. utm_source=chatgpt.com with no referrer).
		const detail = [utmSource, host].find(
			(v) => v && v.toLowerCase() !== label.toLowerCase(),
		);
		return { label, kind, detail: detail ?? null, fields };
	}
	if (utmSource)
		return { label: utmSource, kind: "other", detail: host, fields };
	if (host) return { label: host, kind: "other", detail: null, fields };
	return { label: "Direct", kind: "direct", detail: null, fields };
}

const fieldSelect = {
	userId: screencapUserSources.userId,
	referrerHost: screencapUserSources.referrerHost,
	utmSource: screencapUserSources.utmSource,
	utmMedium: screencapUserSources.utmMedium,
	utmCampaign: screencapUserSources.utmCampaign,
	landingPath: screencapUserSources.landingPath,
	firstSeenAt: screencapUserSources.firstSeenAt,
};

function toFields(r: SignupSourceFields): SignupSourceFields {
	return {
		referrerHost: r.referrerHost,
		utmSource: r.utmSource,
		utmMedium: r.utmMedium,
		utmCampaign: r.utmCampaign,
		landingPath: r.landingPath,
		firstSeenAt: r.firstSeenAt,
	};
}

export async function sourcesForUsers(
	userIds: string[],
): Promise<Map<string, SignupSource>> {
	const out = new Map<string, SignupSource>();
	if (userIds.length === 0) return out;
	const rows = await db()
		.select(fieldSelect)
		.from(screencapUserSources)
		.where(inArray(screencapUserSources.userId, userIds as UserId[]));
	for (const r of rows)
		out.set(String(r.userId), classifySignupSource(toFields(r)));
	for (const id of userIds)
		if (!out.has(id)) out.set(id, classifySignupSource(null));
	return out;
}

export async function getUserSource(userId: string): Promise<SignupSource> {
	return (await sourcesForUsers([userId])).get(userId) as SignupSource;
}

/** Sign-ups per source over the last `days` days, most first. Accounts without a row count as "Not tracked". */
export async function signupSourceSummary(
	days = 30,
): Promise<{ label: string; kind: SignupSourceKind; count: number }[]> {
	const since = new Date(Date.now() - days * 86_400_000);
	const rows = await db()
		.select({ ...fieldSelect, joined: users.id })
		.from(users)
		.leftJoin(screencapUserSources, eq(screencapUserSources.userId, users.id))
		.where(gte(users.created_at, since))
		.orderBy(desc(users.created_at));
	const counts = new Map<
		string,
		{ label: string; kind: SignupSourceKind; count: number }
	>();
	for (const r of rows) {
		const s = classifySignupSource(r.userId ? toFields(r) : null);
		const entry = counts.get(s.label) ?? {
			label: s.label,
			kind: s.kind,
			count: 0,
		};
		entry.count += 1;
		counts.set(s.label, entry);
	}
	return [...counts.values()].sort((a, b) => b.count - a.count);
}

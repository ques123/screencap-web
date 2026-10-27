import { db } from "./index.ts";
import { screencapUserSources } from "./schema.ts";

/** First-touch attribution cookie, written by SIGNUP_SOURCE_SNIPPET and read at account creation. */
export const SIGNUP_SOURCE_COOKIE = "sc_ref";

// Same script runs on the static landing pages (site/assets/ref.js in the deploy repo); keep them in step.
// Sets sc_ref once, on the first page view that has a signal: an outside referrer, utm/ad-click
// params, or a share link. Values are short and contain no personal data.
export const SIGNUP_SOURCE_SNIPPET = `(function(){try{
if(/(?:^|; )sc_ref=/.test(document.cookie))return;
var q=new URLSearchParams(location.search),p=location.pathname,r="";
try{var h=new URL(document.referrer).hostname.toLowerCase();if(h&&h!==location.hostname&&!/(^|\\.)screencap\\.co$|^accounts\\.google\\.com$|^appleid\\.apple\\.com$|cloudflareaccess\\.com$|stripe\\.com$/.test(h))r=h}catch(e){}
var s=q.get("utm_source")||q.get("ref")||(q.has("gclid")?"google-ads":q.has("msclkid")?"bing-ads":"");
if(!r&&!s&&!/^\\/s\\//.test(p))return;
var c=function(v){return(v||"").slice(0,100)};
var v=JSON.stringify({r:r,s:c(s),m:c(q.get("utm_medium")),c:c(q.get("utm_campaign")),l:p.slice(0,200),t:Math.floor(Date.now()/1e3)});
document.cookie="sc_ref="+encodeURIComponent(v)+"; Max-Age=7776000; Path=/; SameSite=Lax"+(location.protocol==="https:"?"; Secure":"");
}catch(e){}})();`;

export type SignupSourceFields = {
	referrerHost: string | null;
	utmSource: string | null;
	utmMedium: string | null;
	utmCampaign: string | null;
	landingPath: string | null;
	firstSeenAt: Date | null;
};

function str(value: unknown, max: number): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed ? trimmed.slice(0, max) : null;
}

/** Parses the sc_ref cookie value (URL-encoded JSON). Anything unreadable gives all-null fields. */
export function parseSignupSourceCookie(
	raw: string | null | undefined,
): SignupSourceFields {
	const empty: SignupSourceFields = {
		referrerHost: null,
		utmSource: null,
		utmMedium: null,
		utmCampaign: null,
		landingPath: null,
		firstSeenAt: null,
	};
	if (!raw) return empty;
	let data: Record<string, unknown>;
	try {
		let text = raw;
		try {
			text = decodeURIComponent(raw);
		} catch {}
		const parsed = JSON.parse(text);
		if (!parsed || typeof parsed !== "object") return empty;
		data = parsed as Record<string, unknown>;
	} catch {
		return empty;
	}
	const t = typeof data.t === "number" ? data.t : Number.NaN;
	const firstSeenAt =
		Number.isFinite(t) && t > 1_700_000_000 && t < 4_000_000_000
			? new Date(t * 1000)
			: null;
	return {
		referrerHost: str(data.r, 255)?.toLowerCase() ?? null,
		utmSource: str(data.s, 100),
		utmMedium: str(data.m, 100),
		utmCampaign: str(data.c, 100),
		landingPath: str(data.l, 255),
		firstSeenAt,
	};
}

/** Saves where a new account came from. First write wins; a missing cookie still gets a row ("direct"). */
export async function recordSignupSource(
	userId: string,
	cookieValue: string | null | undefined,
) {
	const id = userId as typeof screencapUserSources.$inferInsert.userId;
	await db()
		.insert(screencapUserSources)
		.values({ userId: id, ...parseSignupSourceCookie(cookieValue) })
		.onDuplicateKeyUpdate({ set: { userId: id } });
}

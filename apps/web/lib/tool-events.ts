export const TOOL_SLUGS = [
	"mp4-to-gif",
	"gif-to-mp4",
	"mov-to-mp4",
	"video-speed-controller",
] as const;

export const TOOL_STEPS = [
	"view",
	"file_selected",
	"convert_started",
	"convert_ok",
	"convert_failed",
	"downloaded",
	"prompt_shown",
	"cta_signup",
	"cta_download",
	"signed_up",
] as const;

export type ToolSlug = (typeof TOOL_SLUGS)[number];
export type ToolStep = (typeof TOOL_STEPS)[number];

export const TOOL_LABELS: Record<ToolSlug, string> = {
	"mp4-to-gif": "MP4 to GIF",
	"gif-to-mp4": "GIF to MP4",
	"mov-to-mp4": "MOV to MP4",
	"video-speed-controller": "Video speed controller",
};

export const SIZE_BUCKETS = [
	"<1 MB",
	"1-10 MB",
	"10-50 MB",
	"50-200 MB",
	"200 MB-1 GB",
	">1 GB",
] as const;

export const DURATION_BUCKETS = [
	"<10 s",
	"10-30 s",
	"30-60 s",
	"1-5 min",
	"5-15 min",
	">15 min",
] as const;

const MB = 1024 * 1024;

export function isToolSlug(v: unknown): v is ToolSlug {
	return typeof v === "string" && (TOOL_SLUGS as readonly string[]).includes(v);
}

export function isToolStep(v: unknown): v is ToolStep {
	return typeof v === "string" && (TOOL_STEPS as readonly string[]).includes(v);
}

function finite(v: unknown): v is number {
	return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

export function sizeBucket(bytes: unknown): string | null {
	if (!finite(bytes)) return null;
	if (bytes < MB) return SIZE_BUCKETS[0];
	if (bytes < 10 * MB) return SIZE_BUCKETS[1];
	if (bytes < 50 * MB) return SIZE_BUCKETS[2];
	if (bytes < 200 * MB) return SIZE_BUCKETS[3];
	if (bytes < 1024 * MB) return SIZE_BUCKETS[4];
	return SIZE_BUCKETS[5];
}

export function durationBucket(seconds: unknown): string | null {
	if (!finite(seconds)) return null;
	if (seconds < 10) return DURATION_BUCKETS[0];
	if (seconds < 30) return DURATION_BUCKETS[1];
	if (seconds < 60) return DURATION_BUCKETS[2];
	if (seconds < 300) return DURATION_BUCKETS[3];
	if (seconds < 900) return DURATION_BUCKETS[4];
	return DURATION_BUCKETS[5];
}

export function cleanErrorClass(v: unknown): string | null {
	if (typeof v !== "string") return null;
	const s = v
		.replace(/[^\w .:/-]/g, "")
		.trim()
		.slice(0, 64);
	return s || null;
}

export function hostOf(url: unknown): string | null {
	if (typeof url !== "string" || !url) return null;
	try {
		const h = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
		return h ? h.slice(0, 128) : null;
	} catch {
		return null;
	}
}

export function cleanUtm(v: unknown): string | null {
	if (typeof v !== "string") return null;
	const s = v
		.replace(/[^\w .:/+-]/g, "")
		.trim()
		.slice(0, 64);
	return s || null;
}

const BOT_UA =
	/bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|httpx|go-http-client|axios|node-fetch|java\//i;

export function isBotUserAgent(ua: string | null | undefined): boolean {
	if (!ua) return true;
	return BOT_UA.test(ua);
}

export type ToolEventInput = {
	tool: ToolSlug;
	step: ToolStep;
	visitId: string | null;
	sizeBucket: string | null;
	durationBucket: string | null;
	outputBucket: string | null;
	errorClass: string | null;
	referrerHost: string | null;
	utmSource: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseToolEvent(
	body: unknown,
	refererHeader?: string | null,
): ToolEventInput | null {
	if (!body || typeof body !== "object") return null;
	const b = body as Record<string, unknown>;
	if (!isToolSlug(b.tool) || !isToolStep(b.step)) return null;
	let utm: string | null = null;
	if (typeof b.pageUrl === "string") {
		try {
			utm = cleanUtm(new URL(b.pageUrl).searchParams.get("utm_source"));
		} catch {}
	}
	return {
		tool: b.tool,
		step: b.step,
		visitId:
			typeof b.visitId === "string" && UUID.test(b.visitId) ? b.visitId : null,
		sizeBucket: sizeBucket(b.fileSizeBytes),
		durationBucket: durationBucket(b.durationSeconds),
		outputBucket: sizeBucket(b.outputSizeBytes),
		errorClass: cleanErrorClass(b.errorClass),
		referrerHost: hostOf(b.referrer) ?? hostOf(refererHeader),
		utmSource: utm,
	};
}

export function createRateLimiter(limit: number, windowMs: number) {
	const hits = new Map<string, { count: number; resetAt: number }>();
	return (key: string, now = Date.now()): boolean => {
		if (hits.size > 5000) {
			for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
		}
		const e = hits.get(key);
		if (!e || e.resetAt <= now) {
			hits.set(key, { count: 1, resetAt: now + windowMs });
			return true;
		}
		e.count += 1;
		return e.count <= limit;
	};
}

import { createHash, timingSafeEqual } from "node:crypto";

const sha = (v: string) => createHash("sha256").update(v).digest();

/**
 * True only when the x-screencap-cron header equals SCREENCAP_CRON_SECRET.
 * Both sides are hashed first so the compare is constant time whatever the length.
 */
export function isCronAuthorized(
	headerValue: string | null | undefined,
	secret: string | null | undefined = process.env.SCREENCAP_CRON_SECRET,
): boolean {
	if (!secret || !headerValue) return false;
	return timingSafeEqual(sha(headerValue), sha(secret));
}

export function notFound(): Response {
	return new Response("Not found", { status: 404 });
}

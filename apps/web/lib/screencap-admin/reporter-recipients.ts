/** Pure helpers for the reporter emails (kept free of server-only imports so they can be unit tested). */

/** At most this many "we received your report" emails per address per day, so the public form cannot be used to flood someone's inbox. */
export const MAX_RECEIPTS_PER_DAY = 3;

/** One decision email per address and recording, whatever the letter case or how many times they reported it. */
export function reporterRecipients(
	rows: { reporterEmail: string | null; videoId: string }[],
): { email: string; videoId: string }[] {
	const seen = new Set<string>();
	const out: { email: string; videoId: string }[] = [];
	for (const row of rows) {
		const email = row.reporterEmail?.trim();
		if (!email) continue;
		const key = `${email.toLowerCase()} ${row.videoId}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push({ email, videoId: row.videoId });
	}
	return out;
}

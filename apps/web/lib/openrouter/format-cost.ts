const INPUT_TOKENS_PER_HOUR = 25_000;
const OUTPUT_TOKENS_PER_HOUR = 5_000;

/** Ceil to a whole number of `unit`s, ignoring floating point noise (0.04 * 100 = 4.000000000000001). */
const ceilScaled = (value: number, scale: number) =>
	Math.ceil(Number((value * scale).toFixed(6)));

const formatDollars = (usd: number) =>
	`$${(ceilScaled(usd, 100) / 100).toFixed(2)}`;

/** Rough estimate: one hour of video = 25k input tokens + 5k output tokens. */
export function summaryPerHourUsd(
	promptPerToken: number,
	completionPerToken: number,
): number {
	return (
		INPUT_TOKENS_PER_HOUR * promptPerToken +
		OUTPUT_TOKENS_PER_HOUR * completionPerToken
	);
}

/** Cost per hour of video, always rounded up. Values that ceil to 100 cents render as dollars. */
export function formatPerHour(usd: number | null): string {
	if (usd === null || !Number.isFinite(usd)) return "Price unknown";
	if (usd <= 0) return "Free";
	if (usd < 0.01) return "Under 1¢ an hour";
	const cents = ceilScaled(usd, 100);
	if (cents < 100) return `${cents}¢ an hour`;
	return `${formatDollars(usd)} an hour`;
}

/** Spend totals: ceil to cents. */
export function formatUsd(usd: number): string {
	if (usd < 0.01) return "under $0.01";
	return formatDollars(usd);
}

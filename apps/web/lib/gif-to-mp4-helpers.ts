export const MIN_FRAME_DELAY_MS = 20;
export const DEFAULT_FRAME_DELAY_MS = 100;
export const DEFAULT_MAX_WIDTH = 1920;

export const normalizeDelayMs = (delayMs: number | null | undefined) => {
	if (
		typeof delayMs !== "number" ||
		!Number.isFinite(delayMs) ||
		delayMs < MIN_FRAME_DELAY_MS
	) {
		return DEFAULT_FRAME_DELAY_MS;
	}
	return Math.round(delayMs);
};

const toEven = (value: number) => Math.max(2, Math.round(value / 2) * 2);

export const calculateOutputSize = (
	width: number,
	height: number,
	maxWidth: number | null,
) => {
	const limit = maxWidth ?? DEFAULT_MAX_WIDTH;
	const scale = width > limit ? limit / width : 1;
	return {
		width: toEven(width * scale),
		height: toEven(height * scale),
	};
};

export const createTimelineClock = () => {
	let elapsedMs = 0;
	return {
		advance(delayMs: number | null | undefined) {
			const durationMs = normalizeDelayMs(delayMs);
			const timestamp = elapsedMs / 1000;
			elapsedMs += durationMs;
			return { timestamp, duration: durationMs / 1000 };
		},
		get totalSeconds() {
			return elapsedMs / 1000;
		},
	};
};

export const calculateBitrate = (width: number, height: number) =>
	Math.min(12_000_000, Math.max(500_000, Math.round(width * height * 3)));

export const avcCodecCandidates = (width: number, height: number) => {
	const macroblocks = Math.ceil(width / 16) * Math.ceil(height / 16);
	let level = "34";
	if (macroblocks <= 1620) level = "1e";
	else if (macroblocks <= 3600) level = "1f";
	else if (macroblocks <= 8192) level = "28";
	else if (macroblocks <= 22080) level = "32";
	return [`avc1.6400${level}`, `avc1.4d00${level}`, `avc1.4200${level}`];
};

export const RESOLUTION_OPTIONS = [
	{ label: "Original (up to 1920)", value: 0 },
	{ label: "1080", value: 1080 },
	{ label: "720", value: 720 },
	{ label: "480", value: 480 },
];

export const REPEAT_OPTIONS = [1, 2, 3, 5, 10];

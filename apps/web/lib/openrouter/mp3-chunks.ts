/**
 * Pure-TypeScript MP3 splitter. Cuts only at MPEG audio frame boundaries so
 * every chunk is independently decodable and its duration is exact, which lets
 * callers offset per-chunk transcript timestamps without drift.
 */

export type Mp3Chunk = {
	buffer: Buffer;
	startMs: number;
	durationMs: number;
};

// Indexed by the 4-bit bitrate field; 0 = free format, 15 = bad (both invalid).
const BITRATES_MPEG1_L3 = [
	0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320,
];
const BITRATES_MPEG2_L3 = [
	0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160,
];

const SAMPLE_RATES = {
	1: [44100, 48000, 32000],
	2: [22050, 24000, 16000],
	2.5: [11025, 12000, 8000],
} as const;

type FrameInfo = { length: number; samples: number; sampleRate: number };

function parseFrameHeader(buf: Buffer, offset: number): FrameInfo | null {
	if (offset + 4 > buf.length) return null;
	const b0 = buf[offset] as number;
	const b1 = buf[offset + 1] as number;
	const b2 = buf[offset + 2] as number;
	if (b0 !== 0xff || (b1 & 0xe0) !== 0xe0) return null;

	const versionBits = (b1 >> 3) & 0x03;
	const layerBits = (b1 >> 1) & 0x03;
	if (versionBits === 1 || layerBits !== 1) return null; // reserved / not Layer III

	const bitrateIndex = (b2 >> 4) & 0x0f;
	const sampleRateIndex = (b2 >> 2) & 0x03;
	if (bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) {
		return null;
	}
	const padding = (b2 >> 1) & 0x01;

	const version = versionBits === 3 ? 1 : versionBits === 2 ? 2 : 2.5;
	const bitrate = (version === 1 ? BITRATES_MPEG1_L3 : BITRATES_MPEG2_L3)[
		bitrateIndex
	];
	const sampleRate = SAMPLE_RATES[version][sampleRateIndex];
	if (!bitrate || !sampleRate) return null;

	const samples = version === 1 ? 1152 : 576;
	const length =
		Math.floor(((version === 1 ? 144 : 72) * bitrate * 1000) / sampleRate) +
		padding;
	return { length, samples, sampleRate };
}

function id3v2Size(buf: Buffer): number {
	if (
		buf.length >= 10 &&
		buf[0] === 0x49 &&
		buf[1] === 0x44 &&
		buf[2] === 0x33
	) {
		const size =
			(((buf[6] as number) & 0x7f) << 21) |
			(((buf[7] as number) & 0x7f) << 14) |
			(((buf[8] as number) & 0x7f) << 7) |
			((buf[9] as number) & 0x7f);
		const footer = (buf[5] as number) & 0x10 ? 10 : 0;
		return 10 + size + footer;
	}
	return 0;
}

type Frame = { offset: number; length: number; durationMs: number };

const RESYNC_LOOKAHEAD_BYTES = 4096;

/** True when a valid frame starting at `pos` is followed by another frame, EOF or a TAG trailer. */
function isChainedFrame(buf: Buffer, pos: number): boolean {
	const info = parseFrameHeader(buf, pos);
	if (!info || pos + info.length > buf.length) return false;
	const next = pos + info.length;
	return (
		next >= buf.length ||
		parseFrameHeader(buf, next) !== null ||
		(buf[next] === 0x54 && buf[next + 1] === 0x41 && buf[next + 2] === 0x47)
	);
}

function scanFrames(buf: Buffer): Frame[] {
	const frames: Frame[] = [];
	let pos = id3v2Size(buf);

	while (pos + 4 <= buf.length) {
		const info = parseFrameHeader(buf, pos);
		if (info && pos + info.length <= buf.length) {
			const next = pos + info.length;
			// Guard against false sync words: a real frame is followed by another
			// frame, the end of the data, or (after garbage) a frame that is
			// itself properly chained.
			let accepted = isChainedFrame(buf, pos);
			if (!accepted) {
				const limit = Math.min(buf.length - 4, next + RESYNC_LOOKAHEAD_BYTES);
				for (let q = next; q <= limit; q++) {
					if (isChainedFrame(buf, q)) {
						accepted = true;
						break;
					}
				}
			}
			if (accepted) {
				frames.push({
					offset: pos,
					length: info.length,
					durationMs: (info.samples * 1000) / info.sampleRate,
				});
				pos = next;
				continue;
			}
		}
		pos += 1;
	}

	return frames;
}

export function splitMp3(
	buffer: Buffer,
	maxChunkSeconds = 300,
	fallbackDurationMs = 0,
): Mp3Chunk[] {
	const frames = scanFrames(buffer);
	if (frames.length === 0) {
		return [{ buffer, startMs: 0, durationMs: fallbackDurationMs }];
	}

	const maxMs = Math.max(1, maxChunkSeconds) * 1000;
	const chunks: Mp3Chunk[] = [];

	let chunkStartIndex = 0;
	let chunkMs = 0; // duration of the open chunk
	let elapsedMs = 0; // total duration of all closed chunks

	const close = (endIndex: number) => {
		const first = frames[chunkStartIndex] as Frame;
		const last = frames[endIndex - 1] as Frame;
		const startMs = Math.round(elapsedMs);
		const endMs = Math.round(elapsedMs + chunkMs);
		chunks.push({
			buffer: buffer.subarray(first.offset, last.offset + last.length),
			startMs,
			durationMs: endMs - startMs,
		});
		elapsedMs += chunkMs;
		chunkMs = 0;
		chunkStartIndex = endIndex;
	};

	for (let i = 0; i < frames.length; i++) {
		const frame = frames[i] as Frame;
		if (i > chunkStartIndex && chunkMs + frame.durationMs > maxMs) close(i);
		chunkMs += frame.durationMs;
	}
	close(frames.length);

	return chunks;
}

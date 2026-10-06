import { describe, expect, it } from "vitest";
import { splitMp3 } from "@/lib/openrouter/mp3-chunks";

// MPEG-1 Layer III, 128 kbps, 44.1 kHz: 1152 samples/frame, 417 or 418 bytes.
const FRAME_MS = (1152 * 1000) / 44100;

function frame(padding: 0 | 1 = 0, fill = 0): Buffer {
	const length = 417 + padding;
	const buf = Buffer.alloc(length, fill);
	buf[0] = 0xff;
	buf[1] = 0xfb; // MPEG-1, Layer III, no CRC
	buf[2] = 0x90 | (padding << 1); // 128 kbps, 44.1 kHz
	buf[3] = 0x00;
	return buf;
}

function frames(count: number): Buffer {
	// Alternate padding like a real 44.1 kHz stream.
	return Buffer.concat(
		Array.from({ length: count }, (_, i) => frame(i % 3 === 0 ? 1 : 0)),
	);
}

function id3v2(payloadSize: number): Buffer {
	const header = Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0, 0, 0, 0]);
	header[6] = (payloadSize >> 21) & 0x7f;
	header[7] = (payloadSize >> 14) & 0x7f;
	header[8] = (payloadSize >> 7) & 0x7f;
	header[9] = payloadSize & 0x7f;
	// Payload deliberately contains a false sync word.
	const payload = Buffer.alloc(payloadSize, 0x20);
	payload[10] = 0xff;
	payload[11] = 0xfb;
	payload[12] = 0x90;
	return Buffer.concat([header, payload]);
}

describe("splitMp3", () => {
	it("returns one chunk when under the limit", () => {
		const chunks = splitMp3(frames(10), 300);
		expect(chunks).toHaveLength(1);
		expect(chunks[0]?.startMs).toBe(0);
		expect(chunks[0]?.durationMs).toBe(Math.round(10 * FRAME_MS));
	});

	it("cuts only at frame boundaries with exact durations", () => {
		const data = frames(1000); // ~26.1 s
		const chunks = splitMp3(data, 10);
		expect(chunks.length).toBe(3);

		let total = 0;
		let offset = 0;
		for (const chunk of chunks) {
			// Each chunk begins with a frame header and tiles the source exactly.
			expect(chunk.buffer[0]).toBe(0xff);
			expect(
				data
					.subarray(offset, offset + chunk.buffer.length)
					.equals(chunk.buffer),
			).toBe(true);
			offset += chunk.buffer.length;
			expect(chunk.durationMs).toBeLessThanOrEqual(10_000);
			expect(chunk.startMs).toBe(Math.round(total));
			total += chunk.durationMs;
		}
		expect(offset).toBe(data.length);
		expect(total).toBeCloseTo(1000 * FRAME_MS, -1);
		// First chunk holds floor(10000 / 26.122) = 382 frames.
		expect(chunks[0]?.durationMs).toBe(Math.round(382 * FRAME_MS));
		expect(chunks[1]?.startMs).toBe(Math.round(382 * FRAME_MS));
	});

	it("skips a leading ID3v2 tag, even one containing a fake sync word", () => {
		const tag = id3v2(100);
		const data = Buffer.concat([tag, frames(20)]);
		const chunks = splitMp3(data, 300);
		expect(chunks).toHaveLength(1);
		expect(chunks[0]?.buffer.length).toBe(frames(20).length);
		expect(chunks[0]?.durationMs).toBe(Math.round(20 * FRAME_MS));
	});

	it("resyncs past garbage between frames", () => {
		const garbage = Buffer.from([0x00, 0x12, 0xff, 0x00, 0x7a, 0x55]);
		const data = Buffer.concat([garbage, frames(5), garbage, frames(5)]);
		const chunks = splitMp3(data, 300);
		expect(chunks).toHaveLength(1);
		expect(chunks[0]?.durationMs).toBe(Math.round(10 * FRAME_MS));
	});

	it("handles MPEG-2 Layer III (576 samples per frame)", () => {
		// MPEG-2, 64 kbps, 22.05 kHz: 72*64000/22050 = 208 bytes (+padding)
		const f = Buffer.alloc(208, 0);
		f[0] = 0xff;
		f[1] = 0xf3;
		f[2] = 0x80; // bitrate idx 8 = 64 kbps, sr idx 0 = 22.05 kHz
		const chunks = splitMp3(Buffer.concat([f, f, f, f]), 300);
		expect(chunks[0]?.durationMs).toBe(Math.round((4 * 576 * 1000) / 22050));
	});

	it("drops a truncated trailing frame", () => {
		const data = Buffer.concat([frames(4), frame().subarray(0, 100)]);
		const chunks = splitMp3(data, 300);
		expect(chunks[0]?.durationMs).toBe(Math.round(4 * FRAME_MS));
	});

	it("falls back to a single chunk when nothing parses", () => {
		const data = Buffer.from("definitely not an mp3");
		const chunks = splitMp3(data, 300, 42_000);
		expect(chunks).toEqual([{ buffer: data, startMs: 0, durationMs: 42_000 }]);
	});
});

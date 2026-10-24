import type { decompressFrame, ParsedGif } from "gifuct-js";
import {
	avcCodecCandidates,
	calculateBitrate,
	calculateOutputSize,
	createTimelineClock,
	normalizeDelayMs,
} from "@/lib/gif-to-mp4-helpers";

export const H264_UNSUPPORTED_MESSAGE =
	"Your browser can't make MP4 files. Try Chrome or Edge on a computer.";

export const INVALID_GIF_MESSAGE =
	"This file could not be read as a GIF. Check that it is a valid GIF image.";

type FrameCallback = (
	source: CanvasImageSource,
	delayMs: number,
) => Promise<void>;

interface GifReader {
	width: number;
	height: number;
	frameCount: number;
	forEachFrame: (callback: FrameCallback) => Promise<void>;
	close: () => void;
}

export interface GifToMp4Options {
	maxWidth: number | null;
	repeat: number;
	background: string;
	onProgress: (percent: number) => void;
}

const openImageDecoderReader = async (
	buffer: ArrayBuffer,
): Promise<GifReader | null> => {
	if (typeof ImageDecoder === "undefined") return null;
	let decoder: ImageDecoder | null = null;
	try {
		if (!(await ImageDecoder.isTypeSupported("image/gif"))) return null;
		decoder = new ImageDecoder({ data: buffer, type: "image/gif" });
		await decoder.tracks.ready;
		await decoder.completed;
		const track = decoder.tracks.selectedTrack;
		if (!track || track.frameCount < 1) {
			decoder.close();
			return null;
		}
		const first = await decoder.decode({ frameIndex: 0 });
		const width = first.image.displayWidth;
		const height = first.image.displayHeight;
		first.image.close();
		const frameCount = track.frameCount;
		const active = decoder;
		return {
			width,
			height,
			frameCount,
			async forEachFrame(callback) {
				for (let index = 0; index < frameCount; index++) {
					const { image } = await active.decode({ frameIndex: index });
					try {
						await callback(image, (image.duration ?? 0) / 1000);
					} finally {
						image.close();
					}
				}
			},
			close: () => active.close(),
		};
	} catch {
		decoder?.close();
		return null;
	}
};

type GifuctFrame = Parameters<typeof decompressFrame>[0];

const openGifuctReader = async (buffer: ArrayBuffer): Promise<GifReader> => {
	const { parseGIF, decompressFrame } = await import("gifuct-js");
	let parsed: ParsedGif;
	let frames: GifuctFrame[];
	try {
		parsed = parseGIF(buffer);
		frames = parsed.frames.filter((f): f is GifuctFrame => "image" in f);
		if (frames[0]) decompressFrame(frames[0], parsed.gct, false);
	} catch {
		throw new Error(INVALID_GIF_MESSAGE);
	}
	const width = parsed.lsd.width;
	const height = parsed.lsd.height;
	if (!frames.length || !width || !height) throw new Error(INVALID_GIF_MESSAGE);
	const gct = parsed.gct;

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext("2d", { willReadFrequently: true });
	const patchCanvas = document.createElement("canvas");
	const patchContext = patchCanvas.getContext("2d");
	if (!context || !patchContext) throw new Error(INVALID_GIF_MESSAGE);

	return {
		width,
		height,
		frameCount: frames.length,
		async forEachFrame(callback) {
			context.clearRect(0, 0, width, height);
			let previous: {
				disposal: number;
				dims: { left: number; top: number; width: number; height: number };
				snapshot: ImageData | null;
			} | null = null;
			for (const rawFrame of frames) {
				// Decode one frame at a time: decompressFrames() holds every frame's pixels
				// and RGBA patch at once, which runs to gigabytes on long GIFs.
				const frame = decompressFrame(rawFrame, gct, true);
				if (previous) {
					if (previous.disposal === 2) {
						const { left, top, width: w, height: h } = previous.dims;
						context.clearRect(left, top, w, h);
					} else if (previous.disposal === 3 && previous.snapshot) {
						context.putImageData(previous.snapshot, 0, 0);
					}
				}
				const snapshot =
					frame.disposalType === 3
						? context.getImageData(0, 0, width, height)
						: null;
				const { left, top, width: w, height: h } = frame.dims;
				patchCanvas.width = w;
				patchCanvas.height = h;
				patchContext.putImageData(
					new ImageData(new Uint8ClampedArray(frame.patch), w, h),
					0,
					0,
				);
				context.drawImage(patchCanvas, left, top);
				previous = { disposal: frame.disposalType, dims: frame.dims, snapshot };
				await callback(canvas, frame.delay);
			}
		},
		close: () => {},
	};
};

const openGifReader = async (buffer: ArrayBuffer) =>
	(await openImageDecoderReader(buffer)) ?? (await openGifuctReader(buffer));

const pickAvcCodec = async (
	width: number,
	height: number,
	bitrate: number,
): Promise<string | null> => {
	if (typeof VideoEncoder === "undefined") return null;
	for (const codec of avcCodecCandidates(width, height)) {
		try {
			const support = await VideoEncoder.isConfigSupported({
				codec,
				width,
				height,
				bitrate,
				avc: { format: "avc" },
			});
			if (support.supported) return codec;
		} catch {}
	}
	return null;
};

export const convertGifToMp4 = async (
	file: File,
	options: GifToMp4Options,
): Promise<Blob> => {
	const buffer = await file.arrayBuffer();
	const reader = await openGifReader(buffer);
	try {
		const size = calculateOutputSize(
			reader.width,
			reader.height,
			options.maxWidth,
		);
		const bitrate = calculateBitrate(size.width, size.height);
		const codec = await pickAvcCodec(size.width, size.height, bitrate);
		if (!codec) throw new Error(H264_UNSUPPORTED_MESSAGE);

		const { Output, Mp4OutputFormat, BufferTarget, CanvasSource } =
			await import("mediabunny");

		const canvas = document.createElement("canvas");
		canvas.width = size.width;
		canvas.height = size.height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error(H264_UNSUPPORTED_MESSAGE);

		const target = new BufferTarget();
		const output = new Output({
			format: new Mp4OutputFormat({ fastStart: "in-memory" }),
			target,
		});
		const source = new CanvasSource(canvas, {
			codec: "avc",
			bitrate,
			fullCodecString: codec,
		});
		output.addVideoTrack(source);
		await output.start();
		let finalized = false;
		try {
			const clock = createTimelineClock();
			const totalFrames = reader.frameCount * options.repeat;
			let encoded = 0;

			for (let pass = 0; pass < options.repeat; pass++) {
				await reader.forEachFrame(async (frameSource, delayMs) => {
					context.fillStyle = options.background;
					context.fillRect(0, 0, size.width, size.height);
					context.drawImage(frameSource, 0, 0, size.width, size.height);
					const { timestamp, duration } = clock.advance(
						normalizeDelayMs(delayMs),
					);
					await source.add(timestamp, duration);
					encoded += 1;
					options.onProgress(
						Math.min(99, Math.round((encoded / totalFrames) * 100)),
					);
				});
			}

			source.close();
			await output.finalize();
			finalized = true;
			if (!target.buffer) throw new Error(H264_UNSUPPORTED_MESSAGE);
			options.onProgress(100);
			return new Blob([target.buffer], { type: "video/mp4" });
		} finally {
			if (!finalized) await output.cancel().catch(() => {});
		}
	} finally {
		reader.close();
	}
};

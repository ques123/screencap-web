"use client";

import { LockIcon, PauseIcon, PlayIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Segment = { url: string; duration: number };

const FRAME_WIDTH = 160;
const FRAME_HEIGHT = 90;
const FRAME_BYTES = FRAME_WIDTH * FRAME_HEIGHT * 3;
const FRAME_INTERVAL_MS = 1000 / 24;
const FALLBACK_DURATION_S = 30;

async function fetchText(url: string, signal: AbortSignal) {
	const response = await fetch(url, { signal });
	if (!response.ok) throw new Error(`${response.status}`);
	return response.text();
}

function playlistEntries(playlist: string) {
	return playlist
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
}

async function loadVideoSegments(
	masterUrl: string,
	signal: AbortSignal,
): Promise<Segment[]> {
	const base = window.location.href;
	const master = await fetchText(new URL(masterUrl, base).toString(), signal);
	const variant = playlistEntries(master).find((line) => !line.startsWith("#"));
	if (!variant) return [];
	const media = await fetchText(new URL(variant, base).toString(), signal);
	const segments: Segment[] = [];
	let duration = 0;
	for (const line of playlistEntries(media)) {
		if (line.startsWith("#EXTINF:")) {
			duration = Number.parseFloat(line.slice("#EXTINF:".length)) || 0;
		} else if (!line.startsWith("#")) {
			segments.push({ url: new URL(line, base).toString(), duration });
			duration = 0;
		}
	}
	return segments.filter((segment) => segment.duration > 0);
}

function formatClock(seconds: number) {
	const whole = Math.max(0, Math.floor(seconds));
	return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function E2eeCiphertextPlayer({
	videoSrc,
	title,
	message,
}: {
	videoSrc: string;
	title: string;
	message: string;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const playingRef = useRef(true);
	const [playing, setPlaying] = useState(true);
	const [clock, setClock] = useState({ elapsed: 0, total: 0 });

	useEffect(() => {
		const canvas = canvasRef.current;
		const context = canvas?.getContext("2d");
		if (!canvas || !context) return;

		const controller = new AbortController();
		const image = context.createImageData(FRAME_WIDTH, FRAME_HEIGHT);
		const fallbackBytes = new Uint8Array(FRAME_BYTES);
		const loaded = new Map<number, Uint8Array>();
		const requested = new Set<number>();
		let segments: Segment[] = [];
		let total = FALLBACK_DURATION_S;
		let elapsed = 0;
		let lastTick = performance.now();
		let lastFrame = 0;
		let lastClock = -1;
		let raf = 0;

		const request = (index: number) => {
			const segment = segments[index];
			if (!segment || requested.has(index)) return;
			requested.add(index);
			fetch(segment.url, { signal: controller.signal })
				.then((response) =>
					response.ok ? response.arrayBuffer() : Promise.reject(),
				)
				.then((buffer) => loaded.set(index, new Uint8Array(buffer)))
				.catch(() => requested.delete(index));
		};

		loadVideoSegments(videoSrc, controller.signal)
			.then((list) => {
				if (list.length === 0) return;
				segments = list;
				total = list.reduce((sum, segment) => sum + segment.duration, 0);
				request(0);
				request(1);
			})
			.catch(() => {});

		const position = () => {
			let start = 0;
			for (let index = 0; index < segments.length; index++) {
				const duration = segments[index]?.duration ?? 0;
				if (elapsed < start + duration) {
					return { index, fraction: (elapsed - start) / duration };
				}
				start += duration;
			}
			return null;
		};

		const draw = () => {
			const at = position();
			let source: Uint8Array | undefined;
			let offset = 0;
			if (at) {
				for (const index of loaded.keys()) {
					if (index < at.index - 1) {
						loaded.delete(index);
						requested.delete(index);
					}
				}
				request(at.index);
				request(at.index + 1);
				source = loaded.get(at.index);
				if (source) offset = Math.floor(at.fraction * source.length);
			}
			if (!source || source.length < FRAME_BYTES) {
				crypto.getRandomValues(fallbackBytes);
				source = fallbackBytes;
				offset = 0;
			}
			const pixels = image.data;
			for (let pixel = 0, byte = offset; pixel < pixels.length; pixel += 4) {
				pixels[pixel] = source[byte % source.length] ?? 0;
				pixels[pixel + 1] = source[(byte + 1) % source.length] ?? 0;
				pixels[pixel + 2] = source[(byte + 2) % source.length] ?? 0;
				pixels[pixel + 3] = 255;
				byte += 3;
			}
			context.putImageData(image, 0, 0);
		};

		const tick = (now: number) => {
			const delta = Math.min(now - lastTick, 250) / 1000;
			lastTick = now;
			if (playingRef.current) {
				elapsed = (elapsed + delta) % total;
				if (now - lastFrame >= FRAME_INTERVAL_MS) {
					lastFrame = now;
					draw();
				}
			}
			const second = Math.floor(elapsed);
			if (second !== lastClock) {
				lastClock = second;
				setClock({ elapsed, total: segments.length > 0 ? total : 0 });
			}
			raf = requestAnimationFrame(tick);
		};
		draw();
		raf = requestAnimationFrame(tick);

		return () => {
			controller.abort();
			cancelAnimationFrame(raf);
		};
	}, [videoSrc]);

	const togglePlaying = () => {
		playingRef.current = !playingRef.current;
		setPlaying(playingRef.current);
	};

	const progress = clock.total > 0 ? (clock.elapsed / clock.total) * 100 : 0;

	return (
		<div className="overflow-hidden absolute inset-0 bg-black rounded-xl">
			<canvas
				ref={canvasRef}
				width={FRAME_WIDTH}
				height={FRAME_HEIGHT}
				aria-hidden
				className="absolute inset-0 w-full h-full"
				style={{ imageRendering: "pixelated" }}
			/>
			<div className="flex absolute inset-0 justify-center items-center p-4 pointer-events-none">
				<div
					role="alert"
					className="pointer-events-auto flex flex-col items-center gap-2 w-full max-w-[400px] rounded-xl bg-black/60 px-5 py-4 text-center text-white shadow-lg backdrop-blur-[2px]"
				>
					<LockIcon className="size-6 text-white/90" aria-hidden />
					<p className="text-sm font-semibold">{title}</p>
					<p className="text-sm leading-relaxed text-white/80 text-balance">
						{message}
					</p>
				</div>
			</div>
			<div className="flex absolute inset-x-0 bottom-0 gap-3 items-center px-4 pt-6 pb-3 bg-gradient-to-t to-transparent from-black/70">
				<button
					type="button"
					onClick={togglePlaying}
					aria-label={playing ? "Pause" : "Play"}
					className="flex justify-center items-center text-white rounded-full transition-colors size-8 hover:bg-white/15"
				>
					{playing ? (
						<PauseIcon className="size-4" aria-hidden />
					) : (
						<PlayIcon className="size-4" aria-hidden />
					)}
				</button>
				<div className="relative flex-1 h-1 rounded-full bg-white/25">
					<div
						className="absolute inset-y-0 left-0 bg-white rounded-full"
						style={{ width: `${progress}%` }}
					/>
				</div>
				<span className="text-xs tabular-nums text-white/80">
					{formatClock(clock.elapsed)}
					{clock.total > 0 && ` / ${formatClock(clock.total)}`}
				</span>
			</div>
		</div>
	);
}

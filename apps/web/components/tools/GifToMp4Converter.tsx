"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
	TOOL_NEXT_STEP_LINES,
	ToolNextStepPrompt,
} from "@/components/tools/ToolNextStepPrompt";
import { toolEvent, useToolView } from "@/components/tools/toolEvents";
import { REPEAT_OPTIONS, RESOLUTION_OPTIONS } from "@/lib/gif-to-mp4-helpers";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

const classifyError = (err: unknown) => {
	const message = err instanceof Error ? err.message : "";
	if (/can't make MP4|not supported|unsupported/i.test(message))
		return "unsupported_browser";
	if (/cancel|abort/i.test(message)) return "cancelled";
	if (/could not be read|decod/i.test(message)) return "decode_failed";
	if (/encod/i.test(message)) return "encode_failed";
	return "other";
};

const getVideoDuration = (url: string) =>
	new Promise<number | undefined>((resolve) => {
		const video = document.createElement("video");
		video.preload = "metadata";
		video.onloadedmetadata = () =>
			resolve(Number.isFinite(video.duration) ? video.duration : undefined);
		video.onerror = () => resolve(undefined);
		video.src = url;
	});

export const GifToMp4Converter = () => {
	useToolView("gif-to-mp4");
	const [file, setFile] = useState<File | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [isConverting, setIsConverting] = useState(false);
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [outputUrl, setOutputUrl] = useState<string | null>(null);
	const [maxWidth, setMaxWidth] = useState(0);
	const [repeat, setRepeat] = useState(1);
	const [background, setBackground] = useState("#ffffff");
	const baseId = useId();
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		return () => {
			if (outputUrl) URL.revokeObjectURL(outputUrl);
		};
	}, [outputUrl]);

	const clearOutput = () => {
		setOutputUrl(null);
		setProgress(0);
	};

	const selectFile = (selected: File | null) => {
		if (!selected || isConverting) return;
		clearOutput();
		setError(null);
		const isGif =
			selected.type === "image/gif" ||
			selected.name.toLowerCase().endsWith(".gif");
		if (!isGif) {
			setFile(null);
			setError("Please choose a GIF file.");
			toolEvent("gif-to-mp4", "convert_failed", {
				errorClass: "invalid_file_type",
				fileSizeBytes: selected.size,
			});
			return;
		}
		if (selected.size > MAX_FILE_SIZE) {
			setFile(null);
			setError("This file is larger than 100 MB. Choose a smaller GIF.");
			toolEvent("gif-to-mp4", "convert_failed", {
				errorClass: "file_too_large",
				fileSizeBytes: selected.size,
			});
			return;
		}
		setFile(selected);
		toolEvent("gif-to-mp4", "file_selected", { fileSizeBytes: selected.size });
	};

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		selectFile(event.target.files?.[0] ?? null);
		event.target.value = "";
	};

	const handleDragOver = (event: React.DragEvent) => {
		event.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (event: React.DragEvent) => {
		event.preventDefault();
		setIsDragging(false);
	};

	const handleDrop = (event: React.DragEvent) => {
		event.preventDefault();
		setIsDragging(false);
		selectFile(event.dataTransfer.files?.[0] ?? null);
	};

	const convertFile = async () => {
		if (!file) return;
		setIsConverting(true);
		setError(null);
		setProgress(0);
		toolEvent("gif-to-mp4", "convert_started", { fileSizeBytes: file.size });
		try {
			const { convertGifToMp4 } = await import("@/lib/gif-to-mp4");
			const blob = await convertGifToMp4(file, {
				maxWidth: maxWidth === 0 ? null : maxWidth,
				repeat,
				background,
				onProgress: setProgress,
			});
			const url = URL.createObjectURL(blob);
			setOutputUrl(url);
			toolEvent("gif-to-mp4", "convert_ok", {
				fileSizeBytes: file.size,
				outputSizeBytes: blob.size,
				durationSeconds: await getVideoDuration(url),
			});
		} catch (err) {
			toolEvent("gif-to-mp4", "convert_failed", {
				errorClass: classifyError(err),
				fileSizeBytes: file.size,
			});
			setError(
				err instanceof Error && err.message
					? err.message
					: "Conversion failed. Try a different GIF.",
			);
		} finally {
			setIsConverting(false);
		}
	};

	const handleDownload = () => {
		if (!outputUrl || !file) return;
		const link = document.createElement("a");
		link.href = outputUrl;
		link.download = `${file.name.replace(/\.gif$/i, "") || "animation"}.mp4`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		toolEvent("gif-to-mp4", "downloaded", { fileSizeBytes: file.size });
	};

	const resetConverter = () => {
		clearOutput();
		setFile(null);
		setError(null);
	};

	return (
		<div className="w-full">
			<h2 className="sc-display mb-6 text-center text-[28px] leading-[1.05] tracking-[-0.03em]">
				GIF to MP4 Converter
			</h2>

			{file && !outputUrl && (
				<div className="mb-6 rounded-[18px] border-2 border-[#D3E3F3] p-4 sm:p-5">
					<h3 className="sc-display mb-3 text-xl tracking-normal">
						MP4 Settings
					</h3>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<div>
							<label
								htmlFor={`${baseId}-max-width`}
								className="mb-1 block text-sm font-semibold text-[#0B2440]"
							>
								Max Width (px)
							</label>
							<select
								id={`${baseId}-max-width`}
								value={maxWidth}
								onChange={(e) => setMaxWidth(parseInt(e.target.value, 10))}
								disabled={isConverting}
								className="w-full rounded-[10px] border-2 border-[#0B2440] bg-white px-2 py-1.5 text-sm font-semibold text-[#0B2440]"
							>
								{RESOLUTION_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
							<p className="mt-1 text-xs text-[#45627F]">
								Only scales down, never up
							</p>
						</div>
						<div>
							<label
								htmlFor={`${baseId}-repeat`}
								className="mb-1 block text-sm font-semibold text-[#0B2440]"
							>
								Repeat
							</label>
							<select
								id={`${baseId}-repeat`}
								value={repeat}
								onChange={(e) => setRepeat(parseInt(e.target.value, 10))}
								disabled={isConverting}
								className="w-full rounded-[10px] border-2 border-[#0B2440] bg-white px-2 py-1.5 text-sm font-semibold text-[#0B2440]"
							>
								{REPEAT_OPTIONS.map((count) => (
									<option key={count} value={count}>
										{count === 1 ? "1 time" : `${count} times`}
									</option>
								))}
							</select>
							<p className="mt-1 text-xs text-[#45627F]">
								MP4 does not loop, so the animation is repeated in the file
							</p>
						</div>
						<div>
							<label
								htmlFor={`${baseId}-background`}
								className="mb-1 block text-sm font-semibold text-[#0B2440]"
							>
								Background Color
							</label>
							<input
								id={`${baseId}-background`}
								type="color"
								value={background}
								onChange={(e) => setBackground(e.target.value)}
								disabled={isConverting}
								className="h-9 w-16 rounded-[10px] border-2 border-[#0B2440] bg-white p-1"
							/>
							<p className="mt-1 text-xs text-[#45627F]">
								Fills transparent areas, since MP4 has no transparency
							</p>
						</div>
					</div>
				</div>
			)}

			<label
				className={`mb-6 flex cursor-pointer flex-col items-center justify-center rounded-[18px] border-[3px] border-dashed p-6 transition-colors focus-within:border-[#1E66B8] sm:p-8 ${
					isDragging
						? "border-[#1E66B8] bg-[#DCEBFA]"
						: "border-[#0B2440]/40 bg-[#EAF3FC] hover:border-[#1E66B8]"
				}`}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				style={{ minHeight: "200px" }}
			>
				<input
					type="file"
					accept="image/gif,.gif"
					className="sr-only"
					onChange={handleFileChange}
					ref={fileInputRef}
					data-testid="gif-file-input"
				/>

				<div className="text-center">
					{!file ? (
						<>
							<svg
								className="mx-auto mb-3 h-12 w-12 text-[#1E66B8]"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<title>File icon</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
								/>
							</svg>
							<p className="sc-display text-xl tracking-normal [overflow-wrap:anywhere]">
								Drag and drop your GIF file here
							</p>
							<p className="mt-1 text-sm text-[#45627F]">
								or click to browse (max 100MB)
							</p>
							<p className="mt-3 text-sm text-[#45627F]">
								Your file never leaves your device. It's converted in your
								browser.
							</p>
						</>
					) : (
						<>
							<svg
								className="mx-auto mb-3 h-12 w-12 text-[#1E66B8]"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<title>File icon</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M5 13l4 4L19 7"
								/>
							</svg>
							<p className="sc-display text-xl tracking-normal [overflow-wrap:anywhere]">
								{file.name}
							</p>
							<p className="mt-1 text-sm text-[#45627F]">
								{(file.size / (1024 * 1024)).toFixed(2)} MB
							</p>
						</>
					)}
				</div>
			</label>

			{error && (
				<div
					role="alert"
					className="mb-6 rounded-[14px] border-[3px] border-[#FF4A2E] bg-[#FFF1EE] p-4 font-medium text-[#B3200A]"
				>
					{error}
				</div>
			)}

			{isConverting && (
				<div className="mb-6">
					<p className="mb-2 text-center font-semibold text-[#0B2440]">
						Converting... {progress}%
					</p>
					<div className="h-3 w-full overflow-hidden rounded-full border-2 border-[#0B2440] bg-white">
						<div
							className="h-full bg-[#1E66B8] transition-all"
							style={{ width: `${progress}%` }}
						></div>
					</div>
				</div>
			)}

			{outputUrl && (
				<div className="mb-6 rounded-[18px] border-[3px] border-[#0B2440] bg-[#EAF3FC] p-4 sm:p-5">
					<p className="sc-display mb-3 text-xl tracking-normal">
						Conversion complete!
					</p>
					<video
						src={outputUrl}
						controls
						loop
						muted
						playsInline
						className="mb-4 w-full rounded-[14px] bg-black"
						style={{ maxHeight: "300px" }}
					></video>
					<div className="flex flex-col gap-4 sm:flex-row">
						<button
							type="button"
							onClick={handleDownload}
							className="sc-btn sc-btn-accent w-full text-white"
						>
							Download MP4
						</button>
					</div>
					<ToolNextStepPrompt
						tool="gif-to-mp4"
						onShow={() => toolEvent("gif-to-mp4", "prompt_shown")}
						onSignupClick={() => toolEvent("gif-to-mp4", "cta_signup")}
						onDownloadClick={() => toolEvent("gif-to-mp4", "cta_download")}
						line={TOOL_NEXT_STEP_LINES["gif-to-mp4"]}
					/>
				</div>
			)}

			<div className="flex flex-col gap-4 sm:flex-row">
				{file && !isConverting && !outputUrl && (
					<button
						type="button"
						onClick={convertFile}
						className="sc-btn sc-btn-accent w-full text-white"
					>
						Convert to MP4
					</button>
				)}

				{(file || outputUrl) && (
					<button
						type="button"
						onClick={resetConverter}
						disabled={isConverting}
						className="sc-btn sc-btn-light w-full text-[#0B2440]"
					>
						{outputUrl ? "Convert Another File" : "Reset"}
					</button>
				)}
			</div>

			<div className="mt-8 border-t border-[#D3E3F3] pt-6 text-center text-sm text-[#45627F]">
				<p>
					This converter works entirely in your browser. Your files are never
					uploaded to any server.
				</p>
			</div>
		</div>
	);
};

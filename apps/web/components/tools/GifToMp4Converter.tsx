"use client";

import { Button } from "@cap/ui";
import { useEffect, useId, useRef, useState } from "react";
import { REPEAT_OPTIONS, RESOLUTION_OPTIONS } from "@/lib/gif-to-mp4-helpers";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export const GifToMp4Converter = () => {
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
		if (!selected) return;
		clearOutput();
		setError(null);
		const isGif =
			selected.type === "image/gif" ||
			selected.name.toLowerCase().endsWith(".gif");
		if (!isGif) {
			setFile(null);
			setError("Please choose a GIF file.");
			return;
		}
		if (selected.size > MAX_FILE_SIZE) {
			setFile(null);
			setError("This file is larger than 100 MB. Choose a smaller GIF.");
			return;
		}
		setFile(selected);
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
		try {
			const { convertGifToMp4 } = await import("@/lib/gif-to-mp4");
			const blob = await convertGifToMp4(file, {
				maxWidth: maxWidth === 0 ? null : maxWidth,
				repeat,
				background,
				onProgress: setProgress,
			});
			setOutputUrl(URL.createObjectURL(blob));
		} catch (err) {
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
	};

	const resetConverter = () => {
		clearOutput();
		setFile(null);
		setError(null);
	};

	return (
		<div className="w-full">
			<h2 className="text-2xl font-semibold text-center mb-6">
				GIF to MP4 Converter
			</h2>

			{file && !outputUrl && (
				<div className="mb-6 border border-gray-200 rounded-lg p-4">
					<h3 className="text-lg font-medium mb-3">MP4 Settings</h3>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
						<div>
							<label
								htmlFor={`${baseId}-max-width`}
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Max Width (px)
							</label>
							<select
								id={`${baseId}-max-width`}
								value={maxWidth}
								onChange={(e) => setMaxWidth(parseInt(e.target.value, 10))}
								disabled={isConverting}
								className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
							>
								{RESOLUTION_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
							<p className="text-xs text-gray-500 mt-1">
								Only scales down, never up
							</p>
						</div>
						<div>
							<label
								htmlFor={`${baseId}-repeat`}
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Repeat
							</label>
							<select
								id={`${baseId}-repeat`}
								value={repeat}
								onChange={(e) => setRepeat(parseInt(e.target.value, 10))}
								disabled={isConverting}
								className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
							>
								{REPEAT_OPTIONS.map((count) => (
									<option key={count} value={count}>
										{count === 1 ? "1 time" : `${count} times`}
									</option>
								))}
							</select>
							<p className="text-xs text-gray-500 mt-1">
								MP4 does not loop, so the animation is repeated in the file
							</p>
						</div>
						<div>
							<label
								htmlFor={`${baseId}-background`}
								className="block text-sm font-medium text-gray-700 mb-1"
							>
								Background Color
							</label>
							<input
								id={`${baseId}-background`}
								type="color"
								value={background}
								onChange={(e) => setBackground(e.target.value)}
								disabled={isConverting}
								className="h-9 w-16 rounded-md border border-gray-300 bg-white p-1"
							/>
							<p className="text-xs text-gray-500 mt-1">
								Fills transparent areas, since MP4 has no transparency
							</p>
						</div>
					</div>
				</div>
			)}

			<label
				className={`border-2 border-dashed rounded-lg p-8 mb-6 flex flex-col items-center justify-center cursor-pointer transition-colors focus-within:border-blue-500 ${
					isDragging
						? "border-blue-500 bg-blue-50"
						: "border-gray-300 hover:border-blue-400"
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
								className="mx-auto h-12 w-12 text-gray-400 mb-3"
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
							<p className="text-lg font-medium text-gray-700">
								Drag and drop your GIF file here
							</p>
							<p className="text-sm text-gray-500 mt-1">
								or click to browse (max 100MB)
							</p>
							<p className="text-sm text-gray-500 mt-3">
								Your file never leaves your device. It's converted in your
								browser.
							</p>
						</>
					) : (
						<>
							<svg
								className="mx-auto h-12 w-12 text-green-500 mb-3"
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
							<p className="text-lg font-medium text-gray-700">{file.name}</p>
							<p className="text-sm text-gray-500 mt-1">
								{(file.size / (1024 * 1024)).toFixed(2)} MB
							</p>
						</>
					)}
				</div>
			</label>

			{error && (
				<div
					role="alert"
					className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600"
				>
					{error}
				</div>
			)}

			{isConverting && (
				<div className="mb-6">
					<p className="text-center text-gray-700 mb-2">
						Converting... {progress}%
					</p>
					<div className="w-full bg-gray-200 rounded-full h-2">
						<div
							className="bg-blue-600 h-2 rounded-full transition-all"
							style={{ width: `${progress}%` }}
						></div>
					</div>
				</div>
			)}

			{outputUrl && (
				<div className="mb-6 p-5 bg-green-50 border border-green-200 rounded-lg">
					<p className="text-green-700 font-medium mb-3">
						Conversion complete!
					</p>
					<video
						src={outputUrl}
						controls
						loop
						muted
						playsInline
						className="w-full rounded-lg mb-4 bg-black"
						style={{ maxHeight: "300px" }}
					></video>
					<div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
						<Button
							variant="primary"
							onClick={handleDownload}
							className="w-full"
						>
							Download MP4
						</Button>
					</div>
				</div>
			)}

			<div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
				{file && !isConverting && !outputUrl && (
					<Button variant="primary" onClick={convertFile} className="w-full">
						Convert to MP4
					</Button>
				)}

				{(file || outputUrl) && (
					<Button
						variant="white"
						onClick={resetConverter}
						disabled={isConverting}
						className="w-full"
					>
						{outputUrl ? "Convert Another File" : "Reset"}
					</Button>
				)}
			</div>

			<div className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-500 text-center">
				<p>
					This converter works entirely in your browser. Your files are never
					uploaded to any server.
				</p>
			</div>
		</div>
	);
};

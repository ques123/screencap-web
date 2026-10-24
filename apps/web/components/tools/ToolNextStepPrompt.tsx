"use client";

import { useEffect, useRef, useState } from "react";

export const TOOL_NEXT_STEP_LINES: Record<string, string> = {
	"mp4-to-gif":
		"Record your screen and share a link that plays instantly, instead of a heavy GIF.",
	"mov-to-mp4":
		"Screencap records straight to MP4, so there is nothing to convert.",
	"speed-up-video":
		"Recording a walkthrough? Screencap gives you a share link the moment you stop.",
	"gif-to-mp4":
		"Need to show something on screen? Record it with Screencap and share a link.",
};

interface ToolNextStepPromptProps {
	tool: string;
	line?: string;
	onShow?: () => void;
	onSignupClick?: () => void;
	onDownloadClick?: () => void;
}

export const ToolNextStepPrompt = ({
	tool,
	line,
	onShow,
	onSignupClick,
	onDownloadClick,
}: ToolNextStepPromptProps) => {
	const [dismissed, setDismissed] = useState(false);

	const shown = useRef(false);

	useEffect(() => {
		if (shown.current) return;
		shown.current = true;
		onShow?.();
	}, [onShow]);

	if (dismissed) return null;

	return (
		<div className="relative mt-4 rounded-[18px] border-[3px] border-[#0B2440] bg-white p-5 pr-12 shadow-[0_5px_0_#0B2440] sm:p-6 sm:pr-14">
			<button
				type="button"
				onClick={() => setDismissed(true)}
				aria-label="Dismiss"
				className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full text-[#45627F] transition-colors hover:bg-[#EAF3FC] hover:text-[#0B2440]"
			>
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={3}
					strokeLinecap="round"
					aria-hidden="true"
				>
					<path d="M6 6l12 12M18 6L6 18" />
				</svg>
			</button>
			<p className="sc-display m-0 text-[22px] leading-[1.1] tracking-[-0.03em]">
				Next time, skip the converter
			</p>
			<p className="mt-2 mb-4 text-[15px] leading-relaxed text-[#1B3A5C]">
				{line ?? TOOL_NEXT_STEP_LINES[tool]}
			</p>
			<div className="flex flex-col gap-4 sm:flex-row">
				<a
					href={`/signup?from=tool-${tool}`}
					onClick={onSignupClick}
					className="sc-btn sc-btn-accent sc-btn-sm text-white no-underline"
				>
					Sign up free
				</a>
				<a
					href="/download"
					onClick={onDownloadClick}
					className="sc-btn sc-btn-light sc-btn-sm text-[#0B2440] no-underline"
				>
					Download for Mac
				</a>
			</div>
		</div>
	);
};

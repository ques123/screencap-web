"use client";

import { Button, type ButtonProps } from "@cap/ui";
import { useCapChromeExtension } from "hooks/useCapChromeExtension";
import Image from "next/image";
import { ChromeExtensionButton } from "@/components/ChromeExtensionButton";

type ChromeRecorderButtonProps = {
	className?: string;
	size?: ButtonProps["size"];
	variant?: ButtonProps["variant"];
};

// Extension installed: open its recorder. Chrome without it: link the Web Store listing.
// Any other browser: nothing (the extension is Chrome-only).
export function ChromeRecorderButton({
	className,
	size = "sm",
	variant = "white",
}: ChromeRecorderButtonProps) {
	const { isChromeBrowser, isInstalled, openRecorder } =
		useCapChromeExtension();

	if (isInstalled)
		return (
			<Button
				onClick={openRecorder}
				size={size}
				variant={variant}
				className={`group ${className ?? ""}`}
				icon={
					<Image
						src="/logos/browsers/google-chrome.svg"
						width={16}
						height={16}
						alt=""
						className="mr-2 size-4 shrink-0"
					/>
				}
			>
				Record with extension
			</Button>
		);

	if (!isChromeBrowser) return null;

	return (
		<ChromeExtensionButton
			size={size}
			variant={variant}
			target="_blank"
			className={className}
		/>
	);
}

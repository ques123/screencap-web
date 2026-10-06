"use client";

import type { ButtonProps } from "@cap/ui";

type ChromeRecorderButtonProps = {
	className?: string;
	size?: ButtonProps["size"];
	variant?: ButtonProps["variant"];
};

// The Chrome extension is not offered on Screencap.
export function ChromeRecorderButton(_props: ChromeRecorderButtonProps) {
	return null;
}

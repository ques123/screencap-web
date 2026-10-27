"use client";

import { Button, type ButtonProps } from "@cap/ui";
import { faApple } from "@fortawesome/free-brands-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";

type MacAppButtonProps = {
	/** The Mac app has signed in to this account (server-side check). */
	hasMacApp: boolean;
	className?: string;
	size?: ButtonProps["size"];
	variant?: ButtonProps["variant"];
};

const isMac = () =>
	/Macintosh|Mac OS X/.test(navigator.userAgent) &&
	!/iPhone|iPad|iPod/.test(navigator.userAgent) &&
	(navigator.maxTouchPoints ?? 0) < 2;

// Mac visitors only: "Open Mac app" (deep link) when the app is signed in to this account,
// otherwise "Get the Mac app" (download page).
export function MacAppButton({
	hasMacApp,
	className,
	size = "sm",
	variant = "white",
}: MacAppButtonProps) {
	const [mac, setMac] = useState(false);
	useEffect(() => setMac(isMac()), []);
	if (!mac) return null;

	return (
		<Button
			href={hasMacApp ? "screencap-desktop://" : "/download"}
			size={size}
			variant={variant}
			className={`flex gap-2 items-center ${className ?? ""}`}
		>
			<FontAwesomeIcon className="size-3.5" icon={faApple} />
			{hasMacApp ? "Open Mac app" : "Get the Mac app"}
		</Button>
	);
}

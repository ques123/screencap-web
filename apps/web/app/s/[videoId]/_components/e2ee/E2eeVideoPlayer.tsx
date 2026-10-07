"use client";

import type { ComponentProps } from "react";
import { HLSVideoPlayer } from "../HLSVideoPlayer";
import { useE2eeKey } from "./E2eeKeyContext";

export function E2eeVideoPlayer(
	props: Omit<ComponentProps<typeof HLSVideoPlayer>, "e2eeKey">,
) {
	const key = useE2eeKey();
	if (!key) return null;
	return <HLSVideoPlayer {...props} e2eeKey={key} />;
}

"use client";

import { LogoSpinner } from "@cap/ui";
import type { ReactNode } from "react";
import { E2eeCiphertextPlayer } from "./E2eeCiphertextPlayer";
import { useE2eeKeyState } from "./E2eeKeyContext";
import {
	E2EE_KEY_MISMATCH_MESSAGE,
	E2EE_LOCKED_TITLE,
	E2EE_MISSING_KEY_MESSAGE,
} from "./key-acquisition";

export function E2eeKeyGate({
	videoSrc,
	children,
}: {
	videoSrc: string;
	children: ReactNode;
}) {
	const state = useE2eeKeyState();
	if (state.status === "plaintext" || state.status === "ready") {
		return <>{children}</>;
	}
	if (state.status === "pending") {
		return (
			<div className="flex absolute inset-0 justify-center items-center bg-black rounded-xl">
				<LogoSpinner className="w-8 h-auto animate-spin sm:w-10" />
			</div>
		);
	}
	return (
		<E2eeCiphertextPlayer
			videoSrc={videoSrc}
			title={E2EE_LOCKED_TITLE}
			message={
				state.status === "mismatch"
					? E2EE_KEY_MISMATCH_MESSAGE
					: E2EE_MISSING_KEY_MESSAGE
			}
		/>
	);
}

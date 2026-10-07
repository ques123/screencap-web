"use client";

import { LogoSpinner } from "@cap/ui";
import { LockIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useE2eeKeyState } from "./E2eeKeyContext";
import {
	E2EE_KEY_MISMATCH_MESSAGE,
	E2EE_MISSING_KEY_MESSAGE,
} from "./key-acquisition";

export function E2eeMessagePanel({ message }: { message: string }) {
	return (
		<div
			role="alert"
			className="flex absolute inset-0 flex-col gap-3 justify-center items-center px-4 bg-black rounded-xl"
		>
			<LockIcon className="text-gray-9 size-10" aria-hidden />
			<p className="text-gray-11 text-sm leading-relaxed text-center text-balance w-full max-w-[380px] mx-auto">
				{message}
			</p>
		</div>
	);
}

export function E2eeKeyGate({ children }: { children: ReactNode }) {
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
		<E2eeMessagePanel
			message={
				state.status === "mismatch"
					? E2EE_KEY_MISMATCH_MESSAGE
					: E2EE_MISSING_KEY_MESSAGE
			}
		/>
	);
}

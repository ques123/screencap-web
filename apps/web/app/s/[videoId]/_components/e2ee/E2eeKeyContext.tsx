"use client";

import { keyStore } from "@cap/e2ee";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import { type KeyResolution, resolveRecordingKey } from "./key-acquisition";

export type E2eeKeyState =
	| { status: "plaintext" }
	| { status: "pending" }
	| KeyResolution;

const PLAINTEXT: E2eeKeyState = { status: "plaintext" };

const E2eeKeyContext = createContext<E2eeKeyState>(PLAINTEXT);

export function useE2eeKeyAcquisition(
	videoId: string,
	e2ee: boolean,
	keyFingerprint: string | null,
): E2eeKeyState {
	const [state, setState] = useState<E2eeKeyState>(
		e2ee ? { status: "pending" } : PLAINTEXT,
	);

	useEffect(() => {
		if (!e2ee) {
			setState(PLAINTEXT);
			return;
		}
		let cancelled = false;
		const resolve = () => {
			resolveRecordingKey({
				hash: window.location.hash,
				expectedFingerprint: keyFingerprint,
				readStoredKey: () => keyStore.get(videoId),
			})
				.then(async (resolution) => {
					if (resolution.status === "ready" && resolution.persist) {
						await keyStore.put(videoId, resolution.key);
					}
					if (!cancelled) setState(resolution);
				})
				.catch(() => {
					if (!cancelled) setState({ status: "needs-key" });
				});
		};
		resolve();
		window.addEventListener("hashchange", resolve);
		return () => {
			cancelled = true;
			window.removeEventListener("hashchange", resolve);
		};
	}, [videoId, e2ee, keyFingerprint]);

	return state;
}

export function E2eeKeyStateProvider({
	state,
	children,
}: {
	state: E2eeKeyState;
	children: ReactNode;
}) {
	return (
		<E2eeKeyContext.Provider value={state}>{children}</E2eeKeyContext.Provider>
	);
}

export function E2eeKeyProvider({
	videoId,
	e2ee,
	keyFingerprint,
	children,
}: {
	videoId: string;
	e2ee: boolean;
	keyFingerprint: string | null;
	children: ReactNode;
}) {
	const state = useE2eeKeyAcquisition(videoId, e2ee, keyFingerprint);
	return (
		<E2eeKeyContext.Provider value={state}>{children}</E2eeKeyContext.Provider>
	);
}

export function useE2eeKeyState(): E2eeKeyState {
	return useContext(E2eeKeyContext);
}

export function useE2eeKey(): Uint8Array | null {
	const state = useContext(E2eeKeyContext);
	return state.status === "ready" ? state.key : null;
}

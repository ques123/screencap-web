"use client";

import { keyStore } from "@cap/e2ee";
import { useEffect, useState } from "react";
import { fetchDecryptedThumbnail } from "./thumbnail";

export function useStoredE2eeKey(
	videoId: string,
	enabled: boolean,
): Uint8Array | null | undefined {
	const [key, setKey] = useState<Uint8Array | null | undefined>(
		enabled ? undefined : null,
	);

	useEffect(() => {
		if (!enabled) {
			setKey(null);
			return;
		}
		let cancelled = false;
		keyStore.get(videoId).then((stored) => {
			if (!cancelled) setKey(stored);
		});
		return () => {
			cancelled = true;
		};
	}, [videoId, enabled]);

	return key;
}

export function useDecryptedThumbnailUrl(
	key: Uint8Array | null | undefined,
	url: string | null | undefined,
): { objectUrl: string | null; failed: boolean } {
	const [state, setState] = useState<{
		objectUrl: string | null;
		failed: boolean;
	}>({ objectUrl: null, failed: false });

	useEffect(() => {
		if (!key || !url) {
			setState({ objectUrl: null, failed: false });
			return;
		}
		let cancelled = false;
		let created: string | null = null;
		fetchDecryptedThumbnail(key, url)
			.then((blob) => {
				created = URL.createObjectURL(blob);
				if (cancelled) {
					URL.revokeObjectURL(created);
					return;
				}
				setState({ objectUrl: created, failed: false });
			})
			.catch(() => {
				if (!cancelled) setState({ objectUrl: null, failed: true });
			});
		return () => {
			cancelled = true;
			if (created) URL.revokeObjectURL(created);
		};
	}, [key, url]);

	return state;
}

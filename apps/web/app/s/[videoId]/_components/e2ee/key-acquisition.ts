import {
	buildShareLink,
	decryptObject,
	E2eeError,
	fingerprint,
	keyStore,
	parseKeyFragment,
	subpathFromUrl,
} from "@cap/e2ee";

export const E2EE_MISSING_KEY_MESSAGE =
	"This recording is end-to-end encrypted. Ask the sender for the full link, which ends in #k=...";
export const E2EE_KEY_MISMATCH_MESSAGE =
	"This link's key doesn't match this recording. Ask the sender for the full link.";
export const E2EE_UNSUPPORTED_MESSAGE =
	"This browser can't play end-to-end encrypted recordings. Try Chrome, Firefox, Edge, or Safari 17.1 or later.";
export const E2EE_DECRYPT_FAILED_MESSAGE =
	"This recording could not be decrypted. The link's key may be wrong or the recording may be damaged.";

export type KeyResolution =
	| { status: "ready"; key: Uint8Array; persist: boolean }
	| { status: "needs-key" }
	| { status: "mismatch" };

export async function resolveRecordingKey(input: {
	hash: string;
	expectedFingerprint: string | null;
	readStoredKey: () => Promise<Uint8Array | null>;
}): Promise<KeyResolution> {
	const matches = async (key: Uint8Array) =>
		input.expectedFingerprint !== null &&
		(await fingerprint(key)) === input.expectedFingerprint;

	let urlKey: Uint8Array | null;
	try {
		urlKey = parseKeyFragment(input.hash);
	} catch (error) {
		if (error instanceof E2eeError && error.kind === "InvalidKey") {
			return { status: "mismatch" };
		}
		throw error;
	}

	if (urlKey) {
		return (await matches(urlKey))
			? { status: "ready", key: urlKey, persist: true }
			: { status: "mismatch" };
	}

	const storedKey = await input.readStoredKey();
	if (storedKey && (await matches(storedKey))) {
		return { status: "ready", key: storedKey, persist: false };
	}
	return { status: "needs-key" };
}

export function keyedShareLink(
	url: string,
	key: Uint8Array | null | undefined,
): string {
	return key ? buildShareLink(url, key) : url;
}

export function embedCodeWithKey(
	code: string,
	key: Uint8Array | null | undefined,
): string {
	if (!key) return code;
	return code.replace(
		/src="([^"#]*\/embed\/[^"#]*)"/,
		(_match, url: string) => `src="${buildShareLink(url, key)}"`,
	);
}

export class E2eeDecryptError extends Error {
	constructor() {
		super(E2EE_DECRYPT_FAILED_MESSAGE);
		this.name = "E2eeDecryptError";
	}
}

export async function decryptFragmentData(
	key: Uint8Array,
	url: string,
	data: ArrayBuffer | Uint8Array,
): Promise<Uint8Array> {
	const subpath = subpathFromUrl(url);
	if (!subpath) throw new E2eeDecryptError();
	try {
		return await decryptObject(key, subpath, data);
	} catch {
		throw new E2eeDecryptError();
	}
}

export async function copyKeyToDuplicate(
	fromVideoId: string,
	duplicateResult: unknown,
): Promise<void> {
	const newId =
		typeof duplicateResult === "object" && duplicateResult !== null
			? (duplicateResult as { videoId?: unknown }).videoId
			: undefined;
	if (typeof newId !== "string") return;
	const key = await keyStore.get(fromVideoId);
	if (key) await keyStore.put(newId, key);
}

export function isE2eeFlag(
	value: number | boolean | null | undefined,
): boolean {
	return value === true || (typeof value === "number" && value !== 0);
}

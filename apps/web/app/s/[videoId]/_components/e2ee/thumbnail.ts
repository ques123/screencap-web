import { decryptObject, subpathFromUrl } from "@cap/e2ee";

export const E2EE_THUMBNAIL_SUBPATH = "screenshot/screen-capture.jpg";

export async function fetchDecryptedThumbnail(
	key: Uint8Array,
	url: string,
	fetchImpl: typeof fetch = fetch,
): Promise<Blob> {
	const response = await fetchImpl(url);
	if (!response.ok)
		throw new Error(`Thumbnail request failed: ${response.status}`);
	const encrypted = await response.arrayBuffer();
	const plaintext = await decryptObject(
		key,
		subpathFromUrl(url) ?? E2EE_THUMBNAIL_SUBPATH,
		encrypted,
	);
	return new Blob([plaintext as BlobPart], { type: "image/jpeg" });
}

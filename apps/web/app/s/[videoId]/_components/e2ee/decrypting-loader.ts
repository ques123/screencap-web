import type {
	FragmentLoaderConstructor,
	HlsConfig,
	Loader,
	LoaderCallbacks,
	LoaderConfiguration,
	LoaderContext,
} from "hls.js";
import { decryptFragmentData } from "./key-acquisition";

export type BaseLoaderClass = new (config: HlsConfig) => Loader<LoaderContext>;

export function createDecryptingLoader(
	BaseLoader: BaseLoaderClass,
	key: Uint8Array,
	onDecryptFailure: (error: Error) => void,
): FragmentLoaderConstructor {
	class DecryptingLoader extends BaseLoader {
		load(
			context: LoaderContext,
			config: LoaderConfiguration,
			callbacks: LoaderCallbacks<LoaderContext>,
		) {
			const { onSuccess, onProgress } = callbacks;
			// hls.js pushes media fragments to its demuxer from onProgress, which the
			// base loader fires with the raw (encrypted) body before onSuccess.
			// Hold it back and replay it with the decrypted body.
			super.load(context, config, {
				...callbacks,
				onProgress: undefined,
				onSuccess: (response, stats, ctx, networkDetails) => {
					if (typeof response.data === "string" || !response.data) {
						onSuccess(response, stats, ctx, networkDetails);
						return;
					}
					decryptFragmentData(key, ctx.url, response.data as ArrayBuffer).then(
						(plaintext) => {
							if (this.stats?.aborted) return;
							const data = plaintext.buffer.slice(
								plaintext.byteOffset,
								plaintext.byteOffset + plaintext.byteLength,
							) as ArrayBuffer;
							onProgress?.(stats, ctx, data, networkDetails);
							onSuccess({ ...response, data }, stats, ctx, networkDetails);
						},
						(error: Error) => {
							if (this.stats?.aborted) return;
							onDecryptFailure(error);
							callbacks.onError(
								{ code: 0, text: error.message },
								ctx,
								networkDetails,
								stats,
							);
						},
					);
				},
			});
		}
	}
	return DecryptingLoader as unknown as FragmentLoaderConstructor;
}

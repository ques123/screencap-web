import { encryptObject } from "@cap/e2ee";
import { describe, expect, it, vi } from "vitest";
import { createDecryptingLoader } from "@/app/s/[videoId]/_components/e2ee/decrypting-loader";
import { E2EE_DECRYPT_FAILED_MESSAGE } from "@/app/s/[videoId]/_components/e2ee/key-acquisition";
import { fetchDecryptedThumbnail } from "@/app/s/[videoId]/_components/e2ee/thumbnail";

const key = new Uint8Array(32).fill(3);
const otherKey = new Uint8Array(32).fill(4);
const plaintext = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
const segmentUrl =
	"https://r2.example.com/owner/vid/segments/video/segment_001.m4s?X-Amz-Signature=abc";

function makeLoader(
	response: { data: ArrayBuffer | string },
	onFailure = vi.fn(),
	loaderKey = key,
) {
	class FakeBase {
		load(
			context: { url: string },
			_config: unknown,
			callbacks: {
				onSuccess: (...args: unknown[]) => void;
				onProgress?: (...args: unknown[]) => void;
			},
		) {
			callbacks.onProgress?.({ stats: true }, context, response.data, null);
			callbacks.onSuccess(
				{ url: context.url, ...response },
				{ stats: true },
				context,
				null,
			);
		}
	}
	const Loader = createDecryptingLoader(
		FakeBase as unknown as Parameters<typeof createDecryptingLoader>[0],
		loaderKey,
		onFailure,
	);
	return { loader: new Loader({} as never), onFailure };
}

const run = (
	loader: { load: (...args: never[]) => void },
	url: string,
): Promise<{ success?: { data: unknown }; error?: unknown }> =>
	new Promise((resolve) => {
		const callbacks = {
			onSuccess: (response: { data: unknown }) =>
				resolve({ success: response }),
			onError: (error: unknown) => resolve({ error }),
			onTimeout: () => {},
		};
		(loader.load as (...args: unknown[]) => void)({ url }, {}, callbacks);
	});

describe("createDecryptingLoader", () => {
	it("decrypts the fragment before calling the original onSuccess", async () => {
		const encrypted = await encryptObject(
			key,
			"segments/video/segment_001.m4s",
			plaintext,
		);
		const { loader } = makeLoader({
			data: encrypted.buffer.slice(
				encrypted.byteOffset,
				encrypted.byteOffset + encrypted.byteLength,
			) as ArrayBuffer,
		});
		const result = await run(loader, segmentUrl);
		expect(new Uint8Array(result.success?.data as ArrayBuffer)).toEqual(
			plaintext,
		);
	});

	it("reports a decrypt failure and errors the load instead of passing garbage on", async () => {
		const encrypted = await encryptObject(
			otherKey,
			"segments/video/segment_001.m4s",
			plaintext,
		);
		const { loader, onFailure } = makeLoader({
			data: encrypted.buffer.slice(
				encrypted.byteOffset,
				encrypted.byteOffset + encrypted.byteLength,
			) as ArrayBuffer,
		});
		const result = await run(loader, segmentUrl);
		expect(result.success).toBeUndefined();
		expect(result.error).toEqual({
			code: 0,
			text: E2EE_DECRYPT_FAILED_MESSAGE,
		});
		expect(onFailure).toHaveBeenCalledTimes(1);
	});

	it("fails when the URL is not a known segment path", async () => {
		const encrypted = await encryptObject(
			key,
			"segments/video/init.mp4",
			plaintext,
		);
		const { loader, onFailure } = makeLoader({
			data: encrypted.buffer.slice(
				encrypted.byteOffset,
				encrypted.byteOffset + encrypted.byteLength,
			) as ArrayBuffer,
		});
		const result = await run(
			loader,
			"https://r2.example.com/owner/vid/other.bin",
		);
		expect(result.error).toBeDefined();
		expect(onFailure).toHaveBeenCalledTimes(1);
	});
});

describe("fetchDecryptedThumbnail", () => {
	it("decrypts a screenshot with the screenshot subpath", async () => {
		const encrypted = await encryptObject(
			key,
			"screenshot/screen-capture.jpg",
			plaintext,
		);
		const body = encrypted.buffer.slice(
			encrypted.byteOffset,
			encrypted.byteOffset + encrypted.byteLength,
		) as ArrayBuffer;
		const fetchImpl = vi.fn(
			async () => new Response(body, { status: 200 }),
		) as unknown as typeof fetch;
		const blob = await fetchDecryptedThumbnail(
			key,
			"https://r2.example.com/owner/vid/screenshot/screen-capture.jpg?sig=1",
			fetchImpl,
		);
		expect(new Uint8Array(await blob.arrayBuffer())).toEqual(plaintext);
		expect(blob.type).toBe("image/jpeg");
	});

	it("rejects on a failed request", async () => {
		const fetchImpl = vi.fn(
			async () => new Response("no", { status: 404 }),
		) as unknown as typeof fetch;
		await expect(
			fetchDecryptedThumbnail(key, "https://x/screenshot/a.jpg", fetchImpl),
		).rejects.toThrow();
	});

	it("replays onProgress with the decrypted body, before onSuccess, never the raw body", async () => {
		const encrypted = await encryptObject(
			key,
			"segments/audio/segment_002.m4s",
			plaintext,
		);
		const { loader } = makeLoader({ data: encrypted.slice().buffer });
		const events: string[] = [];
		const progressBodies: Uint8Array[] = [];
		await new Promise<void>((resolve) => {
			(loader.load as (...args: unknown[]) => void)(
				{
					url: "https://r2.example.com/o/v/segments/audio/segment_002.m4s?sig=1",
				},
				{},
				{
					onProgress: (_s: unknown, _c: unknown, data: ArrayBuffer) => {
						events.push("progress");
						progressBodies.push(new Uint8Array(data));
					},
					onSuccess: () => {
						events.push("success");
						resolve();
					},
					onError: () => resolve(),
					onTimeout: () => {},
				},
			);
		});
		expect(events).toEqual(["progress", "success"]);
		expect(Array.from(progressBodies[0] ?? [])).toEqual(Array.from(plaintext));
	});
});

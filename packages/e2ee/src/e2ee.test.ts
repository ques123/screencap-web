import { describe, expect, it } from "vitest";
import vectors from "../test-vectors.json";
import {
	buildShareLink,
	decodeKey,
	decryptObject,
	E2eeError,
	encodeKey,
	encryptObject,
	fingerprint,
	keyStore,
	parseKeyFragment,
	subpathFromUrl,
} from "./index";

const hex = (bytes: Uint8Array) =>
	Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const unhex = (text: string) =>
	new Uint8Array((text.match(/../g) ?? []).map((h) => Number.parseInt(h, 16)));
const plaintext = (n: number) => {
	const out = new Uint8Array(n);
	for (let i = 0; i < n; i++) out[i] = (i * 31 + 7) % 256;
	return out;
};
const sha256Hex = async (bytes: Uint8Array) =>
	hex(
		new Uint8Array(
			await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)),
		),
	);

const kindOf = (fn: () => unknown) => {
	try {
		fn();
	} catch (e) {
		return e instanceof E2eeError ? e.kind : "other";
	}
	return null;
};

describe("keys", () => {
	for (const v of vectors.keys) {
		it(`round-trips ${v.keyB64url}`, async () => {
			const key = unhex(v.keyHex);
			expect(encodeKey(key)).toBe(v.keyB64url);
			expect(hex(decodeKey(v.keyB64url))).toBe(v.keyHex);
			expect(await fingerprint(key)).toBe(v.fingerprint);
		});
	}
});

describe("fragments", () => {
	for (const v of vectors.fragments) {
		it(`parses ${JSON.stringify(v.hash)}`, () => {
			const run = () => parseKeyFragment(v.hash);
			if ("error" in v && v.error) {
				expect(kindOf(run)).toBe(v.error);
			} else if (v.keyHex) {
				expect(hex(run() as Uint8Array)).toBe(v.keyHex);
			} else {
				expect(run()).toBeNull();
			}
		});
	}

	it("accepts fragments without a leading hash", () => {
		expect(parseKeyFragment("t=1")).toBeNull();
	});
});

describe("links", () => {
	for (const v of vectors.links) {
		it(`builds ${v.link}`, () => {
			expect(
				buildShareLink(v.base, unhex(v.keyHex), v.query ?? undefined),
			).toBe(v.link);
		});
	}
});

describe("objects", () => {
	for (const v of vectors.objects) {
		it(v.name, async () => {
			const key = unhex(v.keyHex);
			const data = plaintext(v.plaintextLength);
			const sealed = await encryptObject(key, v.subpath, data, {
				salt: unhex(v.saltHex),
				chunkLog2: v.chunkLog2,
			});
			expect(sealed.length).toBe(v.ciphertextLength);
			expect(await sha256Hex(sealed)).toBe(v.ciphertextSha256);
			if ("ciphertextHex" in v && v.ciphertextHex) {
				expect(hex(sealed)).toBe(v.ciphertextHex);
			}
			const opened = await decryptObject(key, v.subpath, sealed);
			expect(opened).toEqual(data);
			const asBuffer = await decryptObject(
				key,
				v.subpath,
				sealed.slice().buffer,
			);
			expect(asBuffer).toEqual(data);
		});
	}

	it("uses a random salt by default", async () => {
		const key = unhex(vectors.keys[0]?.keyHex ?? "");
		const a = await encryptObject(key, "x", plaintext(10));
		const b = await encryptObject(key, "x", plaintext(10));
		expect(hex(a)).not.toBe(hex(b));
	});
});

describe("tampered", () => {
	for (const v of vectors.tampered) {
		it(v.name, async () => {
			const result = await decryptObject(
				unhex(v.keyHex),
				v.subpath,
				unhex(v.ciphertextHex),
			).then(
				() => null,
				(e) => (e instanceof E2eeError ? e.kind : "other"),
			);
			expect(result).toBe(v.error);
		});
	}
});

describe("subpathFromUrl", () => {
	const base =
		"https://acct.r2.cloudflarestorage.com/screencap-recordings/OWNER/VID";
	it("extracts segment paths", () => {
		expect(
			subpathFromUrl(
				`${base}/segments/video/segment_012.m4s?X-Amz-Signature=abc`,
			),
		).toBe("segments/video/segment_012.m4s");
		expect(subpathFromUrl(`${base}/segments/audio/init.mp4?X=1#frag`)).toBe(
			"segments/audio/init.mp4",
		);
		expect(subpathFromUrl(`${base}/screenshot/screen-capture.jpg?X=1`)).toBe(
			"screenshot/screen-capture.jpg",
		);
	});
	it("decodes the pathname", () => {
		expect(subpathFromUrl(`${base}/segments%2Fvideo%2Finit.mp4`)).toBe(
			"segments/video/init.mp4",
		);
	});
	it("returns null for other urls", () => {
		expect(subpathFromUrl(`${base}/segments/manifest.json`)).toBeNull();
		expect(
			subpathFromUrl(`${base}/segments/video/segment_1.m4s.bak`),
		).toBeNull();
		expect(subpathFromUrl("not a url")).toBeNull();
	});
});

describe("keyStore without IndexedDB", () => {
	it("resolves safely", async () => {
		expect(typeof indexedDB).toBe("undefined");
		expect(await keyStore.get("v")).toBeNull();
		await expect(
			keyStore.put("v", new Uint8Array(32)),
		).resolves.toBeUndefined();
		await expect(keyStore.remove("v")).resolves.toBeUndefined();
	});
});

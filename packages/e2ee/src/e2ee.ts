export type E2eeErrorKind = "InvalidKey" | "InvalidHeader" | "DecryptFailed";

export class E2eeError extends Error {
	readonly kind: E2eeErrorKind;

	constructor(kind: E2eeErrorKind) {
		super(kind);
		this.name = "E2eeError";
		this.kind = kind;
	}
}

export const KEY_BYTES = 32;

const HEADER_LEN = 32;
const TAG_LEN = 16;
const DEFAULT_CHUNK_LOG2 = 18;
const MIN_CHUNK_LOG2 = 12;
const MAX_CHUNK_LOG2 = 24;
const ALPHABET =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const encoder = new TextEncoder();

type Bytes = Uint8Array<ArrayBuffer>;

function subtle(): SubtleCrypto {
	return globalThis.crypto.subtle;
}

export function encodeKey(key: Uint8Array): string {
	if (key.length !== KEY_BYTES) throw new E2eeError("InvalidKey");
	let out = "";
	for (let i = 0; i < KEY_BYTES; i += 3) {
		const a = key[i] as number;
		const b = i + 1 < KEY_BYTES ? (key[i + 1] as number) : 0;
		const c = i + 2 < KEY_BYTES ? (key[i + 2] as number) : 0;
		const n = (a << 16) | (b << 8) | c;
		out += ALPHABET[(n >> 18) & 63];
		out += ALPHABET[(n >> 12) & 63];
		if (i + 1 < KEY_BYTES) out += ALPHABET[(n >> 6) & 63];
		if (i + 2 < KEY_BYTES) out += ALPHABET[n & 63];
	}
	return out;
}

export function decodeKey(text: string): Uint8Array {
	if (typeof text !== "string" || text.length !== 43) {
		throw new E2eeError("InvalidKey");
	}
	const values: number[] = [];
	for (const ch of text) {
		const v = ALPHABET.indexOf(ch);
		if (v < 0) throw new E2eeError("InvalidKey");
		values.push(v);
	}
	if (((values[42] as number) & 3) !== 0) throw new E2eeError("InvalidKey");
	const out = new Uint8Array(KEY_BYTES);
	let o = 0;
	for (let i = 0; i < 43; i += 4) {
		const v0 = values[i] as number;
		const v1 = values[i + 1] as number;
		const v2 = values[i + 2];
		const v3 = values[i + 3];
		out[o++] = (v0 << 2) | (v1 >> 4);
		if (v2 !== undefined) out[o++] = ((v1 & 15) << 4) | (v2 >> 2);
		if (v3 !== undefined) out[o++] = (((v2 as number) & 3) << 6) | v3;
	}
	return out;
}

export function parseKeyFragment(hash: string): Uint8Array | null {
	const body = hash.startsWith("#") ? hash.slice(1) : hash;
	for (const part of body.split("&")) {
		const eq = part.indexOf("=");
		if (eq < 0 || part.slice(0, eq) !== "k") continue;
		return decodeKey(part.slice(eq + 1));
	}
	return null;
}

export function buildShareLink(
	base: string,
	key: Uint8Array,
	query?: string,
): string {
	const hashAt = base.indexOf("#");
	let link = hashAt >= 0 ? base.slice(0, hashAt) : base;
	const q = query?.replace(/^[?&]/, "");
	if (q) link += `${link.includes("?") ? "&" : "?"}${q}`;
	return `${link}#k=${encodeKey(key)}`;
}

function checkKey(key: Uint8Array) {
	if (!(key instanceof Uint8Array) || key.length !== KEY_BYTES) {
		throw new E2eeError("InvalidKey");
	}
}

function copy(bytes: Uint8Array): Bytes {
	const out = new Uint8Array(new ArrayBuffer(bytes.length));
	out.set(bytes);
	return out;
}

export async function fingerprint(key: Uint8Array): Promise<string> {
	checkKey(key);
	const prefix = encoder.encode("screencap-e2ee-fp");
	const input = new Uint8Array(prefix.length + 1 + KEY_BYTES);
	input.set(prefix, 0);
	input.set(key, prefix.length + 1);
	const digest = new Uint8Array(await subtle().digest("SHA-256", input));
	let hex = "";
	for (let i = 0; i < 16; i++) {
		hex += (digest[i] as number).toString(16).padStart(2, "0");
	}
	return hex;
}

async function deriveSubkey(
	key: Uint8Array,
	salt: Uint8Array,
	subpath: string,
): Promise<CryptoKey> {
	const ikm = await subtle().importKey("raw", copy(key), "HKDF", false, [
		"deriveKey",
	]);
	return subtle().deriveKey(
		{
			name: "HKDF",
			hash: "SHA-256",
			salt: copy(salt),
			info: encoder.encode(`screencap-e2ee/v1/${subpath}`),
		},
		ikm,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
}

function chunkParams(
	header: Uint8Array,
	index: number,
	last: boolean,
): AesGcmParams {
	const nonce = new Uint8Array(12);
	const aad = new Uint8Array(HEADER_LEN + 9);
	aad.set(header, 0);
	const nonceView = new DataView(nonce.buffer);
	const aadView = new DataView(aad.buffer);
	nonceView.setBigUint64(4, BigInt(index));
	aadView.setBigUint64(HEADER_LEN, BigInt(index));
	aad[HEADER_LEN + 8] = last ? 1 : 0;
	return { name: "AES-GCM", iv: nonce, additionalData: aad, tagLength: 128 };
}

export async function encryptObject(
	key: Uint8Array,
	subpath: string,
	plaintext: Uint8Array,
	options?: { salt?: Uint8Array; chunkLog2?: number },
): Promise<Uint8Array> {
	checkKey(key);
	const chunkLog2 = options?.chunkLog2 ?? DEFAULT_CHUNK_LOG2;
	if (
		!Number.isInteger(chunkLog2) ||
		chunkLog2 < MIN_CHUNK_LOG2 ||
		chunkLog2 > MAX_CHUNK_LOG2
	) {
		throw new E2eeError("InvalidHeader");
	}
	const salt =
		options?.salt ?? globalThis.crypto.getRandomValues(new Uint8Array(16));
	if (salt.length !== 16) throw new E2eeError("InvalidHeader");

	const chunkSize = 2 ** chunkLog2;
	const count = Math.max(1, Math.ceil(plaintext.length / chunkSize));
	const out = new Uint8Array(HEADER_LEN + plaintext.length + TAG_LEN * count);
	out.set([0x53, 0x43, 0x45, 0x31, 1, chunkLog2], 0);
	out.set(salt, 16);
	const header = out.subarray(0, HEADER_LEN);
	const subkey = await deriveSubkey(key, salt, subpath);

	let offset = HEADER_LEN;
	for (let i = 0; i < count; i++) {
		const chunk = plaintext.subarray(i * chunkSize, (i + 1) * chunkSize);
		const sealed = new Uint8Array(
			await subtle().encrypt(
				chunkParams(header, i, i === count - 1),
				subkey,
				copy(chunk),
			),
		);
		out.set(sealed, offset);
		offset += sealed.length;
	}
	return out;
}

export async function decryptObject(
	key: Uint8Array,
	subpath: string,
	object: ArrayBuffer | Uint8Array,
): Promise<Uint8Array> {
	checkKey(key);
	const bytes = object instanceof Uint8Array ? object : new Uint8Array(object);
	if (bytes.length < HEADER_LEN + TAG_LEN) throw new E2eeError("InvalidHeader");
	const header = bytes.subarray(0, HEADER_LEN);
	const chunkLog2 = header[5] as number;
	if (
		header[0] !== 0x53 ||
		header[1] !== 0x43 ||
		header[2] !== 0x45 ||
		header[3] !== 0x31 ||
		header[4] !== 1 ||
		chunkLog2 < MIN_CHUNK_LOG2 ||
		chunkLog2 > MAX_CHUNK_LOG2
	) {
		throw new E2eeError("InvalidHeader");
	}
	for (let i = 6; i < 16; i++) {
		if (header[i] !== 0) throw new E2eeError("InvalidHeader");
	}

	const body = bytes.length - HEADER_LEN;
	const pieceSize = 2 ** chunkLog2 + TAG_LEN;
	const count = Math.max(1, Math.ceil(body / pieceSize));
	const lastLen = body - (count - 1) * pieceSize;
	if (lastLen < TAG_LEN) throw new E2eeError("DecryptFailed");

	const subkey = await deriveSubkey(key, header.subarray(16, 32), subpath);
	const out = new Uint8Array(body - TAG_LEN * count);
	let written = 0;
	try {
		for (let i = 0; i < count; i++) {
			const start = HEADER_LEN + i * pieceSize;
			const piece = bytes.subarray(
				start,
				Math.min(start + pieceSize, bytes.length),
			);
			const plain = new Uint8Array(
				await subtle().decrypt(
					chunkParams(header, i, i === count - 1),
					subkey,
					copy(piece),
				),
			);
			out.set(plain, written);
			written += plain.length;
		}
	} catch {
		throw new E2eeError("DecryptFailed");
	}
	return out;
}

const SUBPATH_RE =
	/(?:segments\/(?:video|audio)\/(?:init\.mp4|segment_\d+\.m4s)|screenshot\/[^/]+)$/;

export function subpathFromUrl(url: string): string | null {
	let pathname: string;
	try {
		pathname = decodeURIComponent(new URL(url).pathname);
	} catch {
		return null;
	}
	return SUBPATH_RE.exec(pathname)?.[0] ?? null;
}

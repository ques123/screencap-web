import { encodeKey, fingerprint } from "@cap/e2ee";
import { describe, expect, it } from "vitest";
import {
	embedCodeWithKey,
	isE2eeFlag,
	keyedShareLink,
	resolveRecordingKey,
} from "@/app/s/[videoId]/_components/e2ee/key-acquisition";

const keyA = new Uint8Array(32).fill(7);
const keyB = new Uint8Array(32).fill(9);

const resolve = async (input: {
	hash: string;
	stored?: Uint8Array | null;
	expected: string | null;
}) =>
	resolveRecordingKey({
		hash: input.hash,
		expectedFingerprint: input.expected,
		readStoredKey: async () => input.stored ?? null,
	});

describe("resolveRecordingKey", () => {
	it("accepts a key in the URL whose fingerprint matches and asks to persist it", async () => {
		const expected = await fingerprint(keyA);
		const result = await resolve({ hash: `#k=${encodeKey(keyA)}`, expected });
		expect(result).toEqual({ status: "ready", key: keyA, persist: true });
	});

	it("reports a mismatch when the URL key does not match the fingerprint", async () => {
		const expected = await fingerprint(keyA);
		const result = await resolve({ hash: `#k=${encodeKey(keyB)}`, expected });
		expect(result).toEqual({ status: "mismatch" });
	});

	it("reports a mismatch for a malformed key", async () => {
		const expected = await fingerprint(keyA);
		const result = await resolve({ hash: "#k=not-a-key", expected });
		expect(result).toEqual({ status: "mismatch" });
	});

	it("falls back to the stored key without persisting again", async () => {
		const expected = await fingerprint(keyA);
		const result = await resolve({ hash: "", stored: keyA, expected });
		expect(result).toEqual({ status: "ready", key: keyA, persist: false });
	});

	it("needs a key when the hash is empty and the stored key does not match", async () => {
		const expected = await fingerprint(keyA);
		expect(await resolve({ hash: "", stored: keyB, expected })).toEqual({
			status: "needs-key",
		});
		expect(await resolve({ hash: "", stored: null, expected })).toEqual({
			status: "needs-key",
		});
	});

	it("ignores unrelated fragments", async () => {
		const expected = await fingerprint(keyA);
		expect(await resolve({ hash: "#t=10", stored: null, expected })).toEqual({
			status: "needs-key",
		});
	});

	it("never accepts a key when the server gave no fingerprint", async () => {
		const result = await resolve({
			hash: `#k=${encodeKey(keyA)}`,
			expected: null,
		});
		expect(result).toEqual({ status: "mismatch" });
	});
});

describe("link building", () => {
	it("appends the key as a fragment after the query", () => {
		expect(keyedShareLink("https://screencap.co/s/abc?t=5", keyA)).toBe(
			`https://screencap.co/s/abc?t=5#k=${encodeKey(keyA)}`,
		);
	});

	it("replaces an existing fragment", () => {
		expect(keyedShareLink("https://screencap.co/s/abc#k=old", keyA)).toBe(
			`https://screencap.co/s/abc#k=${encodeKey(keyA)}`,
		);
	});

	it("leaves the link alone without a key", () => {
		expect(keyedShareLink("https://screencap.co/s/abc", null)).toBe(
			"https://screencap.co/s/abc",
		);
	});

	it("adds the key to the iframe src of an embed code", () => {
		const code =
			'<iframe\n\tsrc="https://screencap.co/embed/abc?t=3"\n\tframeborder="0"></iframe>';
		expect(embedCodeWithKey(code, keyA)).toContain(
			`src="https://screencap.co/embed/abc?t=3#k=${encodeKey(keyA)}"`,
		);
		expect(embedCodeWithKey(code, null)).toBe(code);
	});
});

describe("isE2eeFlag", () => {
	it("treats 1 and true as encrypted and null, 0, undefined as plaintext", () => {
		expect(isE2eeFlag(1)).toBe(true);
		expect(isE2eeFlag(true)).toBe(true);
		expect(isE2eeFlag(0)).toBe(false);
		expect(isE2eeFlag(null)).toBe(false);
		expect(isE2eeFlag(undefined)).toBe(false);
	});
});

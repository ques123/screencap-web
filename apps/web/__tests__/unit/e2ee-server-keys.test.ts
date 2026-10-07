import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveReportKey } from "@/app/api/report/validation";
import {
	firstMatchingKey,
	keyFingerprintFromText,
	scrubKeyTokens,
} from "@/lib/e2ee";
import {
	scrubSentryBreadcrumb,
	scrubSentryEvent,
	stripFragment,
} from "@/lib/sentry-scrub";

const vectors = JSON.parse(
	readFileSync(
		resolve(__dirname, "../../../../packages/e2ee/test-vectors.json"),
		"utf8",
	),
) as { keys: { keyB64url: string; fingerprint: string }[] };
const [A, B] = vectors.keys as [
	{ keyB64url: string; fingerprint: string },
	{ keyB64url: string; fingerprint: string },
];

describe("keyFingerprintFromText", () => {
	it("matches the test vectors", () => {
		for (const k of vectors.keys)
			expect(keyFingerprintFromText(k.keyB64url)).toBe(k.fingerprint);
	});

	it("rejects invalid text", () => {
		expect(keyFingerprintFromText("short")).toBeNull();
		expect(keyFingerprintFromText(`${A.keyB64url}A`)).toBeNull();
		expect(keyFingerprintFromText(`${"A".repeat(42)}B`)).toBeNull();
		expect(keyFingerprintFromText(null)).toBeNull();
	});
});

describe("resolveReportKey", () => {
	const base = { details: "", email: "", decryptionKey: "" };

	it("keeps a matching supplied key", () => {
		const r = resolveReportKey(
			{ ...base, decryptionKey: A.keyB64url },
			A.fingerprint,
		);
		expect(r.decryptionKey).toBe(A.keyB64url);
	});

	it("drops a mismatching supplied key", () => {
		const r = resolveReportKey(
			{ ...base, decryptionKey: B.keyB64url },
			A.fingerprint,
		);
		expect(r.decryptionKey).toBeNull();
	});

	it("extracts and scrubs a key pasted in details", () => {
		const r = resolveReportKey(
			{
				...base,
				details: `see http://x/s/abc#k=${A.keyB64url} please`,
			},
			A.fingerprint,
		);
		expect(r.decryptionKey).toBe(A.keyB64url);
		expect(r.details).toBe("see http://x/s/abc#k=[removed] please");
	});

	it("scrubs a non-matching k= token without using it", () => {
		const r = resolveReportKey(
			{ ...base, details: `#k=${B.keyB64url}` },
			A.fingerprint,
		);
		expect(r.decryptionKey).toBeNull();
		expect(r.details).toBe("#k=[removed]");
	});

	it("scrubs a bare matching key and the email", () => {
		const r = resolveReportKey(
			{
				...base,
				details: `key ${A.keyB64url}.`,
				email: `a@b.co?k=${A.keyB64url}`,
			},
			A.fingerprint,
		);
		expect(r.details).toBe("key [removed].");
		expect(r.email).toBe("a@b.co?k=[removed]");
		expect(r.decryptionKey).toBe(A.keyB64url);
	});

	it("leaves unrelated text untouched", () => {
		const text = `this is bad, k=1 and ${"x".repeat(30)} ${B.keyB64url}`;
		const r = resolveReportKey({ ...base, details: text }, A.fingerprint);
		expect(r.details).toBe(text);
		expect(r.decryptionKey).toBeNull();
	});

	it("stores nothing when the video has no fingerprint", () => {
		const r = resolveReportKey(
			{ ...base, decryptionKey: A.keyB64url, details: `k=${A.keyB64url}` },
			null,
		);
		expect(r.decryptionKey).toBeNull();
		expect(r.details).toBe("k=[removed]");
		expect(scrubKeyTokens("hello", null).text).toBe("hello");
	});
});

describe("firstMatchingKey", () => {
	it("skips a newer non-matching row", () => {
		const rows = [
			{ id: 3, key: B.keyB64url },
			{ id: 2, key: "garbage" },
			{ id: 1, key: A.keyB64url },
		];
		expect(firstMatchingKey(rows, A.fingerprint)?.id).toBe(1);
		expect(firstMatchingKey([rows[0] as (typeof rows)[0]], A.fingerprint)).toBe(
			null,
		);
		expect(firstMatchingKey(rows, null)).toBeNull();
	});
});

describe("sentry scrub", () => {
	it("strips fragments from strings", () => {
		expect(stripFragment("https://a/s/x#k=abc&t=3")).toBe("https://a/s/x");
		expect(stripFragment("no hash")).toBe("no hash");
	});

	it("scrubs events", () => {
		const e = scrubSentryEvent({
			request: { url: "https://a/s/x#k=abc" },
			transaction: "/s/x#k=abc",
			extra: { href: "https://a/s/x#k=abc", n: 5 },
			breadcrumbs: [{ message: "go #k=abc", data: { url: "/s/x#k=abc" } }],
		});
		expect(JSON.stringify(e)).not.toContain("k=abc");
		expect(e.extra?.n).toBe(5);
	});

	it("scrubs breadcrumbs", () => {
		const b = scrubSentryBreadcrumb({
			message: "nav /s/x#k=abc",
			data: { url: "/a#k=abc", from: "/b#k=abc", to: "/c#k=abc", other: 1 },
		});
		expect(JSON.stringify(b)).not.toContain("k=abc");
		expect(b.data?.other).toBe(1);
	});
});

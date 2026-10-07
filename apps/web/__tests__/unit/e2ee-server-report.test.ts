import { describe, expect, it } from "vitest";
import { validateReport } from "@/app/api/report/validation";

const base = { videoId: "abc123xyz456789", reason: "other" };
const KEY = `${"A".repeat(42)}A`;

describe("report decryptionKey validation", () => {
	it("is optional", () => {
		const r = validateReport(base);
		expect(r.ok && r.value.decryptionKey).toBe("");
		const empty = validateReport({ ...base, decryptionKey: "" });
		expect(empty.ok && empty.value.decryptionKey).toBe("");
		const nul = validateReport({ ...base, decryptionKey: null });
		expect(nul.ok && nul.value.decryptionKey).toBe("");
	});

	it("accepts a valid key", () => {
		const r = validateReport({ ...base, decryptionKey: KEY });
		expect(r.ok && r.value.decryptionKey).toBe(KEY);
	});

	it("rejects wrong length", () => {
		expect(validateReport({ ...base, decryptionKey: KEY.slice(1) }).ok).toBe(
			false,
		);
		expect(validateReport({ ...base, decryptionKey: `${KEY}A` }).ok).toBe(
			false,
		);
	});

	it("rejects standard base64 characters", () => {
		expect(
			validateReport({ ...base, decryptionKey: `${"A".repeat(41)}+A` }).ok,
		).toBe(false);
		expect(
			validateReport({ ...base, decryptionKey: `${"A".repeat(41)}/A` }).ok,
		).toBe(false);
	});

	it("rejects a non-canonical last character and non-strings", () => {
		expect(
			validateReport({ ...base, decryptionKey: `${"A".repeat(42)}B` }).ok,
		).toBe(false);
		expect(validateReport({ ...base, decryptionKey: 5 }).ok).toBe(false);
	});
});

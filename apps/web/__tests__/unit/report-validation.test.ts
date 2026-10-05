import { describe, expect, it } from "vitest";
import { validateReport } from "@/app/api/report/validation";

const base = { videoId: "abc123XYZ", reason: "spam", details: "", email: "" };

describe("validateReport", () => {
	it("accepts a minimal report", () => {
		expect(validateReport(base).ok).toBe(true);
	});
	it("rejects unknown reasons and bad ids", () => {
		expect(validateReport({ ...base, reason: "nope" }).ok).toBe(false);
		expect(validateReport({ ...base, videoId: "a/b" }).ok).toBe(false);
		expect(validateReport(null).ok).toBe(false);
	});
	it("enforces details and email limits", () => {
		expect(validateReport({ ...base, details: "x".repeat(2001) }).ok).toBe(
			false,
		);
		expect(validateReport({ ...base, details: "x".repeat(2000) }).ok).toBe(true);
		expect(validateReport({ ...base, email: "bad" }).ok).toBe(false);
		expect(validateReport({ ...base, email: "a@b.co" }).ok).toBe(true);
	});
});

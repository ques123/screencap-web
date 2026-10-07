import { describe, expect, it } from "vitest";
import { isCronAuthorized, notFound } from "@/app/api/admin/_guard";

describe("cron secret guard", () => {
	it("accepts the exact secret", () => {
		expect(isCronAuthorized("s3cret", "s3cret")).toBe(true);
	});
	it("rejects a wrong or different-length value", () => {
		expect(isCronAuthorized("wrong", "s3cret")).toBe(false);
		expect(isCronAuthorized("s3cret-longer", "s3cret")).toBe(false);
	});
	it("rejects when the header or secret is missing or empty", () => {
		expect(isCronAuthorized(null, "s3cret")).toBe(false);
		expect(isCronAuthorized("", "s3cret")).toBe(false);
		expect(isCronAuthorized("s3cret", "")).toBe(false);
		expect(isCronAuthorized("s3cret", undefined)).toBe(false);
	});
	it("answers 404", () => {
		expect(notFound().status).toBe(404);
	});
});

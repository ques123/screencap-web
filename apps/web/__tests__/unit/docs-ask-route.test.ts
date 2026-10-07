import type { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

describe("docs ask route", () => {
	it("is not available on Screencap and returns 404", async () => {
		const { POST } = await import("@/app/api/docs/ask/route");
		const response = await POST({
			json: async () => ({ question: "How do I record?" }),
			headers: new Headers(),
		} as unknown as NextRequest);

		expect(response.status).toBe(404);
	});
});

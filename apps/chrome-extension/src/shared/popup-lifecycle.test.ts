import { describe, expect, it } from "vitest";
import { shouldKeepErrorOnPopupClose } from "./popup-lifecycle";

describe("shouldKeepErrorOnPopupClose", () => {
	const error = { phase: "error", message: "boom" } as const;

	it("keeps an error the user had no time to read", () => {
		expect(shouldKeepErrorOnPopupClose(error, 300, 1500)).toBe(true);
	});

	it("lets an error be acknowledged after the popup was open a while", () => {
		expect(shouldKeepErrorOnPopupClose(error, 4000, 1500)).toBe(false);
	});

	it("never keeps non-error states", () => {
		expect(shouldKeepErrorOnPopupClose({ phase: "idle" }, 100, 1500)).toBe(
			false,
		);
	});
});

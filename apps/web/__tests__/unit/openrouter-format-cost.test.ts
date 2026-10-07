import { describe, expect, it } from "vitest";
import {
	formatPerHour,
	formatUsd,
	summaryPerHourUsd,
} from "@/lib/openrouter/format-cost";

describe("formatPerHour", () => {
	it.each([
		[null, "Price unknown"],
		[0, "Free"],
		[0.004, "Under 1¢ an hour"],
		[0.0099, "Under 1¢ an hour"],
		[0.01, "1¢ an hour"],
		[0.012, "2¢ an hour"],
		[0.04, "4¢ an hour"],
		[0.027, "3¢ an hour"],
		[0.36, "36¢ an hour"],
		[0.361, "37¢ an hour"],
		[0.99, "99¢ an hour"],
		// values that ceil to 100 cents render as dollars
		[0.991, "$1.00 an hour"],
		[0.999, "$1.00 an hour"],
		[1, "$1.00 an hour"],
		[1.204, "$1.21 an hour"],
		[2.5, "$2.50 an hour"],
	])("%s -> %s", (input, expected) => {
		expect(formatPerHour(input)).toBe(expected);
	});

	it("does not over-round on floating point noise", () => {
		expect(0.07 * 100).not.toBe(7);
		expect(formatPerHour(0.04)).toBe("4¢ an hour");
		expect(formatPerHour(0.07)).toBe("7¢ an hour");
		expect(formatPerHour(0.29)).toBe("29¢ an hour");
	});
});

describe("formatUsd", () => {
	it("handles tiny, rounded and larger totals", () => {
		expect(formatUsd(0)).toBe("under $0.01");
		expect(formatUsd(0.004)).toBe("under $0.01");
		expect(formatUsd(0.01)).toBe("$0.01");
		expect(formatUsd(0.611)).toBe("$0.62");
		expect(formatUsd(0.62)).toBe("$0.62");
		expect(formatUsd(12.001)).toBe("$12.01");
	});
});

describe("summaryPerHourUsd", () => {
	it("uses 25k input + 5k output tokens", () => {
		expect(summaryPerHourUsd(0.000001, 0.000002)).toBeCloseTo(0.035, 9);
		expect(summaryPerHourUsd(0, 0)).toBe(0);
	});
});

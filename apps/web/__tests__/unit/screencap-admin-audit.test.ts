import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@cap/env", () => ({ serverEnv: () => ({}) }));
vi.mock("@cap/database", () => ({ db: () => ({}) }));
vi.mock("@cap/database/schema", () => ({ screencapAdminLog: {} }));

import { adminLogToCsv } from "@/lib/screencap-admin/audit";
import type { AdminLogEntry } from "@/lib/screencap-admin/types";

const base: AdminLogEntry = {
	id: 1,
	at: new Date("2026-01-02T03:04:05.000Z"),
	adminEmail: "a@b.com",
	action: "user.block",
	targetType: "user",
	targetId: "u1",
	targetLabel: 'He said "hi", ok',
	reason: "line1\nline2",
	source: null,
	notified: true,
	details: { a: 1 },
};

describe("adminLogToCsv", () => {
	it("escapes quotes, commas and newlines", () => {
		const csv = adminLogToCsv([base]);
		const lines = csv.split("\r\n");
		expect(lines[0]).toContain("target_label");
		expect(csv).toContain('"He said ""hi"", ok"');
		expect(csv).toContain('"line1\nline2"');
		expect(csv).toContain("2026-01-02T03:04:05.000Z");
		expect(csv).toContain('"{""a"":1}"');
	});
	it("neutralises formulas", () => {
		const csv = adminLogToCsv([{ ...base, targetLabel: "=HYPERLINK(1)" }]);
		expect(csv).toContain("'=HYPERLINK(1)");
	});
});

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@cap/env", () => ({ serverEnv: () => ({}) }));
vi.mock("@cap/database", () => ({ db: () => ({}) }));
vi.mock("@/lib/screencap-admin/notices", () => ({
	sendRemovalNotice: vi.fn(),
}));
vi.mock("@/lib/screencap-admin/audit", () => ({
	logAdminAction: vi.fn(),
	telegramAlert: vi.fn(),
}));

import { snapshotToRow } from "@/lib/screencap-admin/recordings";

describe("snapshotToRow", () => {
	it("revives timestamps and drops generated and unknown columns", () => {
		const row = snapshotToRow(
			{
				id: "abc",
				ownerId: "u1",
				name: "Demo",
				createdAt: "2026-03-04T05:06:07.000Z",
				updatedAt: "2026-03-05T05:06:07.000Z",
				effectiveCreatedAt: "2026-03-04T05:06:07.000Z",
				bogus: 1,
				public: true,
				metadata: { a: 1 },
			},
			"videos",
		);
		expect(row.createdAt).toBeInstanceOf(Date);
		expect((row.createdAt as Date).toISOString()).toBe(
			"2026-03-04T05:06:07.000Z",
		);
		expect(row.updatedAt).toBeInstanceOf(Date);
		expect("effectiveCreatedAt" in row).toBe(false);
		expect("bogus" in row).toBe(false);
		expect(row.public).toBe(true);
		expect(row.metadata).toEqual({ a: 1 });
	});
	it("handles uploads", () => {
		const row = snapshotToRow(
			{
				videoId: "abc",
				uploaded: 5,
				total: 10,
				startedAt: "2026-03-04T05:06:07.000Z",
			},
			"video_uploads",
		);
		expect(row.startedAt).toBeInstanceOf(Date);
		expect(row.total).toBe(10);
	});
});

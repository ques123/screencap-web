import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	rows: [] as unknown[],
	renderVideoOg: vi.fn(async (variant: unknown) => variant),
}));

vi.mock("@cap/database", () => ({
	db: () => ({
		select: () => ({
			from: () => ({
				leftJoin: () => ({ where: async () => mocks.rows }),
			}),
		}),
	}),
}));
vi.mock("@cap/database/schema", () => ({
	users: { id: "id", name: "name" },
	videos: { ownerId: "ownerId", id: "id" },
}));
vi.mock("@cap/web-backend", () => ({
	findScreenshotObjectKey: vi.fn(),
	Storage: {},
}));
vi.mock("@cap/web-backend/src/Storage/recording-output", () => ({
	getPublishedRecordingThumbnailKey: vi.fn(),
}));
vi.mock("@/lib/server", () => ({ runPromise: vi.fn() }));
vi.mock("@/lib/video-storage", () => ({ decodeStorageVideo: vi.fn() }));
vi.mock("@/lib/og/poster-frame", () => ({
	extractPosterFrameDataUri: vi.fn(),
}));
vi.mock("@/lib/og/video-og", () => ({ renderVideoOg: mocks.renderVideoOg }));

import { generateVideoOgImage } from "@/actions/videos/get-og-image";

const generate = (video: Record<string, unknown>) => {
	mocks.rows = [
		{ video: { id: "v1", ownerId: "o1", ...video }, ownerName: "A" },
	];
	return generateVideoOgImage("v1" as never);
};

describe("generateVideoOgImage", () => {
	beforeEach(() => mocks.renderVideoOg.mockClear());

	it("renders the encrypted card for e2ee videos", async () => {
		await generate({ e2ee: 1, password: null });
		expect(mocks.renderVideoOg).toHaveBeenCalledWith({ kind: "encrypted" });
	});

	it("prefers the encrypted card over password", async () => {
		await generate({ e2ee: true, password: "hash" });
		expect(mocks.renderVideoOg).toHaveBeenCalledWith({ kind: "encrypted" });
	});

	it("keeps the password card for password-only videos", async () => {
		await generate({ e2ee: 0, password: "hash" });
		expect(mocks.renderVideoOg).toHaveBeenCalledWith({ kind: "password" });
	});
});

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderVideoOg, type VideoOgVariant } from "../../lib/og/video-og";

const wallpaper = `data:image/jpeg;base64,${readFileSync(
	path.join(process.cwd(), "lib", "og", "assets", "wallpaper.jpg"),
).toString("base64")}`;

const VARIANTS: Record<string, VideoOgVariant> = {
	video: {
		kind: "video",
		video: {
			title: "Cap walkthrough: onboarding for the new team",
			ownerName: "Richie",
			duration: 204,
			screenshotUrl: wallpaper,
		},
	},
	"video-no-thumb": {
		kind: "video",
		video: { title: "Quick bug report", ownerName: "Chris" },
	},
	locked: { kind: "locked" },
	password: { kind: "password" },
	encrypted: { kind: "encrypted" },
	"not-found": { kind: "not-found" },
};

const render = async (variant: VideoOgVariant) => {
	const res = await renderVideoOg(variant);
	expect(res.status).toBe(200);
	const buf = Buffer.from(await res.arrayBuffer());
	expect(buf.readUInt32BE(16)).toBe(1200);
	expect(buf.readUInt32BE(20)).toBe(630);
	return buf;
};

describe("video og variants", () => {
	it("renders every variant as a distinct 1200x630 PNG", async () => {
		const out = process.env.OG_PREVIEW_DIR;
		if (out) mkdirSync(out, { recursive: true });
		const rendered = new Map<string, Buffer>();
		for (const [name, variant] of Object.entries(VARIANTS)) {
			const buf = await render(variant);
			rendered.set(name, buf);
			if (out) writeFileSync(path.join(out, `${name}.png`), buf);
		}
		const unique = new Set(
			[...rendered.values()].map((b) => b.toString("hex")),
		);
		expect(unique.size).toBe(rendered.size);
	});

	it("draws the encrypted label instead of the password one", async () => {
		const encrypted = await render({ kind: "encrypted" });
		const password = await render({ kind: "password" });
		expect(encrypted.equals(password)).toBe(false);
	});
});

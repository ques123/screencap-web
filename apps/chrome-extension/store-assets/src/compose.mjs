// Renders every scene HTML to a flat (no alpha) PNG in ../. Run: node compose.mjs
import { chromium } from "/Users/admin/Code/screencap/screencap-web-chrome-ext/node_modules/@playwright/test/index.mjs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "..");
const jobs = [
	["shot-1", 1280, 800, "screenshot-1-record"],
	["shot-2", 1280, 800, "screenshot-2-modes"],
	["shot-3", 1280, 800, "screenshot-3-camera-mic"],
	["shot-4", 1280, 800, "screenshot-4-recording"],
	["shot-5", 1280, 800, "screenshot-5-link-ready"],
	["promo-small", 440, 280, "promo-small-440x280"],
	["promo-marquee", 1400, 560, "promo-marquee-1400x560"],
];
const tmp = mkdtempSync(tmpdir() + "/sc-compose-");
const browser = await chromium.launch();
try {
	for (const [name, width, height, outName] of jobs) {
		const page = await browser.newPage({ viewport: { width, height } });
		await page.goto("file://" + path.join(here, name + ".html"));
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(400);
		const raw = path.join(tmp, outName + ".png");
		await page.screenshot({ path: raw });
		await page.close();
		// flatten to 24-bit RGB (no alpha channel)
		execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, "-pix_fmt", "rgb24", path.join(outDir, outName + ".png")]);
		console.log(outName, width + "x" + height);
	}
} finally { await browser.close(); rmSync(tmp, { recursive: true, force: true }); }

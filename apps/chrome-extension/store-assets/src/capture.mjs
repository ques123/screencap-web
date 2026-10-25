// Captures the real Screencap UI from dist/ (loaded as an unpacked extension,
// signed-in state mocked) into captures/*.png. Run: node capture.mjs
// Needs: bun run build (dist/), Playwright from the monorepo, ffmpeg.
import { chromium } from "/Users/admin/Code/screencap/screencap-web-chrome-ext/node_modules/@playwright/test/index.mjs";
import { mkdtemp, rm, readFile, copyFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ext = path.resolve(here, "../../dist");
const out = path.join(here, "captures");
const id = "gngdjomhdmmaijkihncegknjpnepfonc"; // fixed by the manifest "key"
const work = await mkdtemp(tmpdir() + "/sc-store-");
const VIEW = { width: 1160, height: 560 }; // page area inside the browser frame

// Fake webcam feed: an illustrated placeholder (no real person).
{
	const b = await chromium.launch();
	const p = await b.newPage({ viewport: { width: 640, height: 480 } });
	await p.goto("file://" + path.join(here, "avatar.html"));
	await p.screenshot({ path: work + "/avatar.png" });
	await b.close();
	execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-loop", "1", "-i", work + "/avatar.png", "-t", "3", "-r", "10", "-pix_fmt", "yuv420p", work + "/cam.y4m"]);
}

const avatarUrl = "data:image/png;base64," + (await readFile(work + "/avatar.png")).toString("base64");
await copyFile(work + "/avatar.png", out + "/avatar.png");
const html = await readFile(path.join(here, "acme-roadmap.html"), "utf8");
const srv = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(0);
const origin = `http://127.0.0.1:${srv.address().port}`;
const ctx = await chromium.launchPersistentContext(work + "/profile", {
	channel: "chromium", headless: true, deviceScaleFactor: 2,
	args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`,
		"--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream",
		`--use-file-for-fake-video-capture=${work}/cam.y4m`],
});
try {
	const w = ctx.serviceWorkers()[0] || await ctx.waitForEvent("serviceworker");
	const set = (items) => w.evaluate((items) => new Promise((r) => chrome.storage.local.set(items, r)), items);
	await set({
		"cap-extension-auth": { authApiKey: "a", userId: "u" },
		"cap-extension-bootstrap-cache": { bootstrap: { user: { id: "u", email: "you@example.com" }, organization: { id: "o", name: "Acme" }, plan: { isPro: false, maxRecordingSeconds: null } }, cachedAt: Date.now() },
	});

	// ---- toolbar dropdown popup ----
	const popup = async (name, fn, h = 380) => {
		const p = await ctx.newPage();
		await p.setViewportSize({ width: 360, height: h });
		await p.goto(`chrome-extension://${id}/action-popup.html`);
		await p.waitForTimeout(2600);
		if (fn) await fn(p);
		await p.waitForTimeout(500);
		const box = await p.locator(".cap-sky").boundingBox();
		await p.screenshot({ path: `${out}/${name}.png`, clip: { x: 0, y: 0, width: 360, height: Math.ceil(box.height) } });
		await p.close();
	};
	await popup("popup-main", async (p) => {
		const hgt = await p.evaluate(() => document.documentElement.scrollHeight);
		await p.setViewportSize({ width: 360, height: hgt });
	}, 600);
	await popup("popup-camera", async (p) => {
		await p.getByRole("button", { name: /No Camera/ }).first().click();
		await p.waitForTimeout(700);
		await p.screenshot({ path: work + "/cam-picker.png" });
		const opts = p.locator("[role=option], [role=dialog] button");
		console.log("camera options:", await opts.allInnerTexts());
		await opts.nth(2).click();
		await p.waitForTimeout(900);
		// Chrome's fake device has a test name; show a typical built-in camera name instead.
		await p.evaluate(() => {
			for (const el of document.querySelectorAll("span.truncate")) {
				if (el.children.length === 0 && /y4m|fake|device|\/var\//i.test(el.textContent) && !/No Camera/i.test(el.textContent)) el.textContent = "FaceTime HD Camera";
			}
		});
	}, 420);
	await popup("popup-modes", async (p) => {
		await p.setViewportSize({ width: 360, height: 400 });
		await p.getByRole("combobox").first().click();
		await p.waitForTimeout(600);
	}, 400);

	// ---- in-page overlays on the Acme page ----
	const page = await ctx.newPage();
	await page.setViewportSize(VIEW);
	await page.goto(origin); await page.waitForTimeout(1500);
	const m = await ctx.newPage(); await m.goto(`chrome-extension://${id}/options.html`);
	const send = async (msg) => { await page.bringToFront(); let err; for (let i = 0; i < 5; i++) { try { return await send1(msg); } catch (e) { err = e; await page.waitForTimeout(800); } } throw err; };
	const send1 = (msg) => m.evaluate(async (msg) => { const [t] = await chrome.tabs.query({ url: "http://127.0.0.1/*" }); await chrome.tabs.sendMessage(t.id, msg); }, msg);
	// The live WebRTC camera preview does not run headless (the bubble renders
	// black), so after the screenshot the bubble area is painted over with the
	// placeholder illustration, at the bubble's known position and size.
	const paintBubble = async (name, bar) => {
		const shotUrl = "data:image/png;base64," + (await readFile(`${out}/${name}.png`)).toString("base64");
		const c = await ctx.newPage();
		await c.setViewportSize(VIEW);
		await c.setContent(`<body style="margin:0;position:relative;width:${VIEW.width}px;height:${VIEW.height}px"><img src="${shotUrl}" style="position:absolute;inset:0;width:${VIEW.width}px;height:${VIEW.height}px"><div style="position:absolute;left:${ws.left - 1}px;bottom:${ws.bottom - 1}px;width:${ws.size + 2}px;height:${ws.size + 2}px;border-radius:50%;background:url(${avatarUrl}) center/cover;box-shadow:0 8px 28px rgba(11,36,64,.22)"></div>${bar ? `<img src="${shotUrl}" style="position:absolute;inset:0;width:${VIEW.width}px;height:${VIEW.height}px;clip-path:inset(${bar.y}px ${VIEW.width - bar.x - bar.w}px ${VIEW.height - bar.y - bar.h}px ${bar.x}px round 29px)">` : ""}</body>`);
		await c.waitForTimeout(300);
		await c.screenshot({ path: `${out}/${name}.png` });
		await c.close();
		await page.bringToFront();
		await page.waitForTimeout(800);
	};
	const shot = async (name, wait = 800) => { await page.bringToFront(); await page.waitForTimeout(wait); await page.screenshot({ path: `${out}/${name}.png` }); if (name !== "page-countdown") await paintBubble(name, name === "page-recording" ? { x: 15, y: 468, w: 96, h: 58 } : null); };
	const rec = (phase, ms) => ({ target: "recording-status", type: "recording-status-changed", status: { phase, videoId: "v", startedAt: Date.now() - ms, durationMs: ms, updatedAt: Date.now() } });
	const ws = { enabled: true, deviceId: "__cap_default_camera__", position: "bottom-left", size: 190, left: 20, bottom: 72, shape: "round", mirror: false };
	await page.screenshot({ path: `${out}/page-plain.png` });
	await send({ type: "overlay-settings", settings: ws, recording: false });
	await send({ type: "overlay-panel-toggle" });
	await shot("page-ready", 3500);
	await send({ type: "overlay-panel-hide" });
	await send(rec("recording", 83000));
	await shot("page-recording", 1500);
	await send({ type: "overlay-hide" });
	await page.waitForTimeout(1500);
	await send({ type: "overlay-countdown", seconds: 3, durationMs: 9000 });
	await shot("page-countdown", 1200);
	await m.close(); await page.close();

	// ---- upload / ready pages ----
	const up = async (name, status) => {
		const p = await ctx.newPage();
		await p.addInitScript((st) => {
			const orig = chrome.runtime.sendMessage.bind(chrome.runtime);
			chrome.runtime.sendMessage = (...a) => {
				const m = a[0];
				if (m && m.type === "get-recording-status") return a[a.length - 1]({ ok: true, status: st });
				return orig(...a);
			};
		}, status);
		await p.setViewportSize(VIEW);
		await p.goto(`chrome-extension://${id}/uploading.html`);
		await p.waitForTimeout(3600);
		await p.screenshot({ path: `${out}/${name}.png` });
		await p.close();
	};
	const base = { videoId: "v", startedAt: Date.now() - 90000, durationMs: 90000, updatedAt: Date.now() };
	await up("page-uploading", { ...base, phase: "uploading", upload: { totalBytes: 48300000, uploadedBytes: 31600000, totalChunks: 12, completedChunks: 7 }, uploadStatus: { status: "uploadingVideo", progress: 65 } });
	await up("page-ready-link", { ...base, phase: "completed", shareUrl: `chrome-extension://${id}/uploading.html#ready` });
} finally { await ctx.close(); srv.close(); await rm(work, { recursive: true, force: true }); }

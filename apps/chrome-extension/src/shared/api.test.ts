import { afterEach, describe, expect, it, vi } from "vitest";
import { createAuthStart } from "./api";
import type { ExtensionSettings } from "./types";

const settingsFor = (apiBaseUrl: string) =>
	({ apiBaseUrl }) as unknown as ExtensionSettings;

describe("createAuthStart errors", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	const stub = (status: number) => {
		vi.stubGlobal("chrome", {
			identity: { getRedirectURL: () => "https://ext.chromiumapp.org/" },
		});
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("bad request", { status })),
		);
		return vi.spyOn(console, "error").mockImplementation(() => undefined);
	};

	it("shows a short human message in production and logs the detail", async () => {
		const consoleError = stub(400);
		await expect(
			createAuthStart(settingsFor("https://screencap.co")),
		).rejects.toThrow(
			"Couldn't start sign-in with Screencap (error 400). Try again in a moment.",
		);
		expect(consoleError).toHaveBeenCalled();
	});

	it("keeps developer instructions for localhost", async () => {
		stub(400);
		await expect(
			createAuthStart(settingsFor("http://localhost:3000")),
		).rejects.toThrow(/dev:extension/);
	});
});

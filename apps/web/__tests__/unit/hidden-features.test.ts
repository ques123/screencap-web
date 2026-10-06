import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("features hidden on Screencap", () => {
	it.each([
		["install", "GET"],
		["callback", "GET"],
		["events", "POST"],
	])("Slack %s route returns 404", (name, method) => {
		const route = read(`app/api/integrations/slack/${name}/route.ts`);
		expect(route).toContain(
			`export const ${method} = () => new Response(null, { status: 404 });`,
		);
	});

	it("desktop API no longer mounts storage routes", () => {
		const route = read("app/api/desktop/[...route]/route.ts");
		expect(route).not.toContain("/s3/config");
		expect(route).not.toContain('"/storage"');
	});

	it("settings nav has no Integrations tab", () => {
		const nav = read(
			"app/(org)/dashboard/settings/organization/_components/SettingsNav.tsx",
		);
		expect(nav).not.toContain("Integrations");
	});

	it("integrations and referral pages call notFound", () => {
		expect(
			read("app/(org)/dashboard/settings/organization/integrations/page.tsx"),
		).toContain("notFound()");
		expect(read("app/(org)/dashboard/refer/page.tsx")).toContain("notFound()");
	});

	it("storage and domain actions throw as unavailable", async () => {
		const { assertAvailableOnScreencap } = await import(
			"@/actions/organization/unavailable"
		);
		expect(() => assertAvailableOnScreencap()).toThrow(
			"not available on Screencap",
		);
	});
});

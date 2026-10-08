import type { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/og/url";
import { SelfHostingPage } from "./SelfHostingPage";

export const metadata: Metadata = buildMarketingMetadata({
	title: "Self-hosting — Screencap",
	description:
		"Screencap is open source under the AGPL-3.0. Read the code, build the Mac app and run it yourself.",
	path: "/self-hosting",
	ogTitle: "Self-host Screencap",
	ogTag: "Self-hosting",
});

export default async function SelfHosting() {
	return <SelfHostingPage />;
}

import type { Metadata } from "next";
import { UsageClient } from "./UsageClient";

export const metadata: Metadata = {
	title: "Developer Usage — Screencap",
};

export default async function UsagePage() {
	return <UsageClient />;
}

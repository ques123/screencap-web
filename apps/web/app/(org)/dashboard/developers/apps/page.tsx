import type { Metadata } from "next";
import { AppsListClient } from "./AppsListClient";

export const metadata: Metadata = {
	title: "Developer Apps — Screencap",
};

export default async function AppsPage() {
	return <AppsListClient />;
}

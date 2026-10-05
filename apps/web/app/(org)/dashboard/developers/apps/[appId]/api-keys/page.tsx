import type { Metadata } from "next";
import { ApiKeysClient } from "./ApiKeysClient";

export const metadata: Metadata = {
	title: "API Keys — Screencap",
};

export default async function ApiKeysPage() {
	return <ApiKeysClient />;
}

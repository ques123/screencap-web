"use client";

import { useEffect } from "react";
import { isToolSlug } from "@/lib/tool-events";

export function ToolAttribution({ from }: { from?: string }) {
	useEffect(() => {
		if (!from?.startsWith("tool-")) return;
		const slug = from.slice("tool-".length);
		if (!isToolSlug(slug)) return;
		try {
			// biome-ignore lint/suspicious/noDocumentCookie: first-party attribution cookie
			document.cookie = `sc_tool=${slug}; Max-Age=${30 * 24 * 3600}; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
		} catch {}
	}, [from]);
	return null;
}

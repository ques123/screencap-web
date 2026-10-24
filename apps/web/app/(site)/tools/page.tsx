import type { Metadata } from "next";
import { buildMarketingMetadata } from "@/lib/og/url";
import { createBreadcrumbSchema } from "@/utils/web-schema";
import { PageContent } from "./PageContent";

export const metadata: Metadata = buildMarketingMetadata({
	title: "Online Tools | Free Browser-Based Utilities",
	description:
		"Free online tools from Screencap: convert MP4 to GIF, convert MOV to MP4, and change video speed. Everything runs in your browser, so your files stay on your device.",
	path: "/tools",
	ogTitle: "Free online tools, right in your browser",
	ogTag: "Tools",
});

const breadcrumbSchema = createBreadcrumbSchema([
	{ name: "Home", url: "https://screencap.co" },
	{ name: "Tools", url: "https://screencap.co/tools" },
]);

export default function ToolsPage() {
	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(breadcrumbSchema),
				}}
			/>
			<PageContent />
		</>
	);
}

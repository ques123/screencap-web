import type { Metadata } from "next";
import { createBreadcrumbSchema } from "@/utils/web-schema";
import { PageContent } from "./PageContent";

const pageUrl = "https://screencap.co/tools";
const heroJpg = "https://screencap.co/assets/img/tools-hub-hero-1520.jpg";
const pageTitle = "Free Video Tools in Your Browser | Screencap";
const pageDescription =
	"Free video tools: MP4 to GIF, GIF to MP4, MOV to MP4, and speed up or slow down a video. They run in your browser, so your file never leaves your device.";
const heroAlt = "four tool stickers on a floating tray";

export const metadata: Metadata = {
	title: pageTitle,
	description: pageDescription,
	openGraph: {
		title: pageTitle,
		description: pageDescription,
		url: pageUrl,
		siteName: "Screencap",
		images: [{ url: heroJpg, width: 1520, height: 760, alt: heroAlt }],
		locale: "en_US",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: pageTitle,
		description: pageDescription,
		images: [{ url: heroJpg, alt: heroAlt }],
	},
	alternates: { canonical: pageUrl },
};

const breadcrumbSchema = createBreadcrumbSchema([
	{ name: "Home", url: "https://screencap.co" },
	{ name: "Tools", url: "https://screencap.co/tools" },
]);

export default function ToolsPage() {
	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(breadcrumbSchema),
				}}
			/>
			<PageContent />
		</>
	);
}

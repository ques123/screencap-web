import type { Metadata } from "next";
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

const org = {
	"@type": "Organization",
	"@id": "https://screencap.co/#org",
	name: "Screencap",
	url: "https://screencap.co/",
};

const structuredData = {
	"@context": "https://schema.org",
	"@graph": [
		{
			"@type": "BreadcrumbList",
			itemListElement: [
				{
					"@type": "ListItem",
					position: 1,
					name: "Home",
					item: "https://screencap.co/",
				},
				{
					"@type": "ListItem",
					position: 2,
					name: "Free tools",
					item: pageUrl,
				},
			],
		},
		{
			"@type": "CollectionPage",
			name: "Free video tools",
			description: pageDescription,
			url: pageUrl,
			image: heroJpg,
			author: { "@type": "Person", name: "Chris", worksFor: org },
			publisher: org,
			datePublished: "2026-10-24",
			dateModified: "2026-10-24",
		},
	],
};

export default function ToolsPage() {
	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(structuredData),
				}}
			/>
			<PageContent />
		</>
	);
}

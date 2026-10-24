import type { Metadata } from "next";
import { GifToMp4Converter } from "@/components/tools/GifToMp4Converter";
import { ToolsPageTemplate } from "@/components/tools/ToolsPageTemplate";
import type { ToolPageContent } from "@/components/tools/types";

const pageUrl = "https://screencap.co/tools/convert/gif-to-mp4";
const heroJpg =
	"https://screencap.co/assets/img/tools-gif-to-mp4-hero-1520.jpg";
const pageTitle = "GIF to MP4 Converter: Free, No Upload | Screencap";
const pageDescription =
	"Convert GIF to MP4 in your browser. Free, no watermark, no sign-up, and your GIF is never uploaded. Keeps frame timing and can repeat the loop.";
const heroAlt =
	"looping picture-frame stickers flowing into a play-button video sticker";

export const metadata: Metadata = {
	title: pageTitle,
	description: pageDescription,
	keywords: [
		"gif to mp4",
		"convert gif to mp4",
		"gif to mp4 converter",
		"gif to mp4 converter free",
		"how to convert gif to mp4",
	],
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

const faqs = [
	{
		question: "Is there a free GIF to MP4 converter with no watermark?",
		answer:
			"Yes. This GIF to MP4 converter is free, adds no watermark and needs no account. It runs in your browser, so there is no upload queue.",
	},
	{
		question: "How big a GIF can I convert?",
		answer:
			"Up to 100 MB. The output is capped at 1920 px wide, and you can scale it down to 1080, 720 or 480 px. It never scales up.",
	},
	{
		question: "Why does my MP4 not loop?",
		answer:
			"MP4 files have no loop setting of their own. Choose Repeat 2, 3, 5 or 10 times to bake the repeats into the file, or switch on loop in the video player you use.",
	},
	{
		question: "Does the MP4 keep my GIF's timing?",
		answer:
			"Yes, each frame keeps its own delay from the GIF. A delay of 0 or under 20 ms is set to 100 ms, which is what browsers do when they play such a GIF.",
	},
	{
		question: "What happens to a transparent GIF?",
		answer:
			"MP4 has no transparency, so transparent pixels are filled with a background colour. The default is white, and you can pick any colour before you convert.",
	},
	{
		question: "Which browsers does it work in?",
		answer:
			"It works best in Chrome or Edge on a computer. If your browser cannot encode H.264 video, the tool tells you instead of producing a broken file. We have not verified phones yet, so we do not promise them.",
	},
];

const breadcrumbs = [
	{ name: "Home", url: "https://screencap.co/" },
	{ name: "Free tools", url: "https://screencap.co/tools" },
	{ name: "GIF to MP4", url: pageUrl },
];

const structuredData = {
	"@context": "https://schema.org",
	"@graph": [
		{
			"@type": "BreadcrumbList",
			itemListElement: breadcrumbs.map((item, index) => ({
				"@type": "ListItem",
				position: index + 1,
				name: item.name,
				item: item.url,
			})),
		},
		{
			"@type": "WebPage",
			name: "GIF to MP4 Converter",
			description: pageDescription,
			url: pageUrl,
			primaryImageOfPage: heroJpg,
			image: heroJpg,
			author: {
				"@type": "Person",
				name: "Chris",
				worksFor: { "@type": "Organization", name: "Screencap" },
			},
			dateModified: "2026-10-24",
		},
		{
			"@type": "WebApplication",
			name: "Screencap GIF to MP4 Converter",
			applicationCategory: "MultimediaApplication",
			operatingSystem: "Any (runs in a web browser)",
			offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
			url: pageUrl,
		},
		{
			"@type": "FAQPage",
			mainEntity: faqs.map((faq) => ({
				"@type": "Question",
				name: faq.question,
				acceptedAnswer: { "@type": "Answer", text: faq.answer },
			})),
		},
	],
};

export default function GifToMp4Page() {
	const pageContent: ToolPageContent = {
		title: "GIF to MP4 Converter: free and private",
		description:
			"To convert a GIF to MP4, drop your GIF into the converter below, choose a width, repeat count and background colour, and press Convert. It makes an H.264 MP4 in your browser, so your file never leaves your device. It is free, adds no watermark and needs no sign-up.",
		byline: "By Chris, Screencap Team",
		updated: "24 October 2026",
		privacyBadge: "Your file never leaves your device",
		heroImage: {
			src: "/assets/img/tools-gif-to-mp4-hero-1520.webp",
			alt: heroAlt,
		},
		sections: [
			{
				title: "How do I convert a GIF to MP4?",
				body: `<p>You can convert a GIF to MP4 in three steps, with no app to install.</p>
<ol>
<li><strong>Drop your GIF</strong> onto the converter above, or click to browse (up to 100 MB).</li>
<li><strong>Choose your settings</strong>: max width, how many times to repeat, and a background colour.</li>
<li><strong>Press Convert</strong>, preview the video, then download the MP4.</li>
</ol>
<p>The file is an H.264 MP4, the most widely supported video format. Short GIFs finish in seconds. Long or large ones take longer, because your browser encodes every frame itself.</p>`,
			},
			{
				title: "Why convert a GIF to MP4?",
				body: `<p>An MP4 is usually much smaller than the GIF it came from, because video compresses frames far better than the GIF format can.</p>
<p>Many apps, slide tools and websites also accept video but not GIFs, or play video more smoothly. A GIF stores each frame with a 256-colour palette. An MP4 does not have that limit.</p>
<p>Check the upload rules of the place you are posting to, since each one sets its own.</p>`,
			},
			{
				title: "What happens to transparency?",
				body: `<p>Transparent areas in your GIF are filled with a solid colour, because MP4 has no transparency. The default is white.</p>
<p>Pick a background colour that matches where the video will sit, such as a dark slide or a coloured page. If your GIF is fully opaque, the background colour makes no difference.</p>`,
				image: {
					src: "/assets/img/tools-gif-to-mp4-fig-1-1520.webp",
					alt: "a transparency checkerboard covered by a white swatch beside a play-button video",
				},
			},
			{
				title: "How do I make the MP4 loop?",
				body: `<p>An MP4 does not loop on its own, so a converted GIF plays once and stops unless you ask for more.</p>
<p>You have two options. Set <strong>Repeat</strong> to 2, 3, 5 or 10 times, and the repeats are written into the file. Or leave it at 1 and turn on loop in the video player, slide tool or website you use.</p>
<p>Repeating makes the file longer and bigger, roughly in proportion to the count. Keep it low unless you need a fixed run time.</p>`,
				image: {
					src: "/assets/img/tools-gif-to-mp4-fig-2-1520.webp",
					alt: "a play-button video wrapped three times by a repeat arrow",
				},
			},
			{
				title: "Does it keep the GIF's timing?",
				body: `<p>Yes. Every frame keeps the delay stored in the GIF, so slow and fast moments play as they did.</p>
<p>One exception: a delay of 0 or under 20 ms is set to 100 ms. Browsers do the same when they play such a GIF, so the MP4 looks the way you remember it.</p>
<p>The output width and height are rounded to even numbers, which video encoders need. Max width is <strong>original (capped at 1920), 1080, 720 or 480</strong>, and it only scales down.</p>`,
			},
			{
				title: "Is it safe to convert GIFs here?",
				body: `<p>Your file never leaves your device. The conversion runs inside your browser tab, and your GIF is not uploaded to Screencap or anyone else.</p>
<p>That makes it fine for private or work files. Many online converters upload your file to their servers, so it is worth checking before you drop in anything sensitive.</p>`,
			},
		],
		featuresTitle: "What this GIF to MP4 converter does",
		featuresDescription:
			"Small, specific and free. Every number below is what the tool really does.",
		features: [
			{
				title: "0 bytes uploaded",
				description:
					"Frames are decoded and encoded in your browser, so the GIF stays on your computer.",
			},
			{
				title: "4 width choices",
				description:
					"Original (capped at 1920 px), 1080, 720 or 480 px wide. It only scales down.",
			},
			{
				title: "5 repeat counts",
				description:
					"Repeat the animation 1, 2, 3, 5 or 10 times, because an MP4 does not loop by itself.",
			},
			{
				title: "Up to 100 MB",
				description:
					"Drop in a GIF up to 100 MB. Free, no watermark and no sign-up.",
			},
		],
		faqs,
		cta: {
			title: "Need to show something on screen?",
			description:
				"Record it with Screencap and share a link that plays instantly, instead of sending a heavy GIF. On the Mac app you can switch on end-to-end encryption, so only people with the link can watch.",
			buttonText: "Sign up free",
			buttonHref: "/signup?from=tool-gif-to-mp4",
			secondaryButtonText: "Download for Mac",
			secondaryButtonHref: "/download",
		},
	};

	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD
				dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
			/>
			<ToolsPageTemplate
				content={pageContent}
				toolComponent={<GifToMp4Converter />}
			/>
		</>
	);
}

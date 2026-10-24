import type { Metadata } from "next";
import { GifToMp4Converter } from "@/components/tools/GifToMp4Converter";
import { ToolsPageTemplate } from "@/components/tools/ToolsPageTemplate";
import type { ToolPageContent } from "@/components/tools/types";

const pageUrl = "https://screencap.co/tools/convert/gif-to-mp4";
const heroJpg =
	"https://screencap.co/assets/img/tools-gif-to-mp4-hero-1520.jpg";
const pageTitle = "GIF to MP4 Converter: Free, No Upload | Screencap";
const pageDescription =
	"Convert GIF to MP4 in your browser for free. Your GIF is never uploaded, each frame keeps its timing, and you can repeat the loop or fill transparency.";
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
			"Yes. This GIF to MP4 converter is free, needs no account and puts no logo on your video. The work happens on your own computer, so large GIFs never sit in an upload queue.",
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
		question: "Will the MP4 be smaller than the GIF?",
		answer:
			"Usually, and often by a wide margin, because video compression handles moving pictures far better than GIF does. Very small or simple GIFs can come out close in size. Each extra repeat makes the MP4 longer and bigger.",
	},
	{
		question: "Can I convert a GIF to MP4 on Mac or Windows?",
		answer:
			"Yes. Open this page in Chrome or Edge on either and use the converter above. There is nothing to install, and the result is the same H.264 MP4 on both.",
	},
	{
		question: "Which browsers does it work in?",
		answer:
			"It works best in Chrome or Edge on a computer. If your browser cannot encode H.264 video, the tool tells you so instead of producing a broken file.",
	},
];

const org = {
	"@type": "Organization",
	"@id": "https://screencap.co/#org",
	name: "Screencap",
	url: "https://screencap.co/",
};

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
			author: { "@type": "Person", name: "Chris", worksFor: org },
			publisher: org,
			datePublished: "2026-10-24",
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
		title: "GIF to MP4 Converter: free, with no upload",
		description:
			"To convert a GIF to MP4, drop your GIF into the converter below, pick a width, a repeat count and a background colour, then press Convert. Your browser builds an H.264 MP4 on your own computer, so your file never leaves your device. It is free and needs no account.",
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
<li><strong>Choose your settings</strong> for max width, repeats and background colour, or keep the defaults.</li>
<li><strong>Press Convert</strong>, preview the video, then download the MP4.</li>
</ol>
<p>The result is an H.264 MP4, the video format most players and websites expect. Short GIFs finish in seconds. Long or large ones take longer, because your browser encodes every frame itself.</p>`,
			},
			{
				title: "Why convert a GIF to MP4?",
				body: `<p>An MP4 is usually much smaller than the GIF it came from, because video compresses frames far better than the GIF format can.</p>
<p>Some sites and apps take video uploads but not GIFs. A GIF also stores each frame with a 256-colour palette, a limit an MP4 does not have.</p>
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
<p>Set <strong>Repeat</strong> to 2, 3, 5 or 10 and the repeats are written into the file. Or leave it at 1 and turn on looping in the video player or slide tool you use.</p>
<p>Repeating makes the file longer and bigger, roughly in proportion to the count. Keep it low unless you need a fixed run time.</p>`,
				image: {
					src: "/assets/img/tools-gif-to-mp4-fig-2-1520.webp",
					alt: "a play-button video wrapped three times by a repeat arrow",
				},
			},
			{
				title: "Does it keep the GIF's timing?",
				body: `<p>Yes. Every frame keeps the delay stored in the GIF, so slow and fast moments play as they did.</p>
<p>One exception: a delay of 0 or under 20 ms is set to 100 ms. Most browsers apply a similar rule when they play such a GIF, so the MP4 should look the way you remember it.</p>
<p>The output width and height are rounded to even numbers, which video encoders need. Max width is <strong>original (capped at 1920), 1080, 720 or 480</strong>, and it only scales down.</p>`,
			},
			{
				title: "Is it safe to convert GIFs here?",
				body: `<p>Yes. The GIF is decoded and re-encoded inside this browser tab, and the file is never sent to Screencap or to anyone else.</p>
<p>That matters for screenshots of private chats or unreleased work. Many online converters upload what you give them to their own servers, so it is worth knowing which kind you are using.</p>`,
			},
		],
		featuresTitle: "What this GIF to MP4 converter does",
		featuresDescription:
			"The settings and limits, exactly as the converter applies them.",
		features: [
			{
				title: "Stays on your computer",
				description:
					"Frames are decoded and encoded in your browser. The GIF is never uploaded.",
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
				description: "Drop in a GIF of up to 100 MB. Free, with no watermark.",
			},
		],
		faqs,
		cta: {
			title: "Need to show something on screen?",
			description:
				"Record it with Screencap and send a link instead of a GIF. The link plays in any browser, and in the Mac app you can turn on end-to-end encryption, which keeps the key in the link where our servers never see it.",
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

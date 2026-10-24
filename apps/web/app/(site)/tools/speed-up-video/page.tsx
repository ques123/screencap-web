import type { Metadata } from "next";
import { SpeedController } from "@/components/tools/SpeedController";
import { ToolsPageTemplate } from "@/components/tools/ToolsPageTemplate";
import type { ToolPageContent } from "@/components/tools/types";

const pageUrl = "https://screencap.co/tools/speed-up-video";
const heroJpg =
	"https://screencap.co/assets/img/tools-speed-up-video-hero-1520.jpg";
const pageTitle = "Speed Up Video Online Free: Change Speed | Screencap";
const pageDescription =
	"Speed up or slow down a video in your browser, from 0.25x to 3x. Free, no sign-up, and your video is never uploaded. Works best in Chrome or Edge.";
const heroAlt =
	"a speedometer dial beside a play-button video with motion streaks, a turtle and a hare";

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

const faqs = [
	{
		question: "Is there a free way to speed up a video online?",
		answer:
			"Yes. This video speed changer is free, needs no account and runs in your browser, so there is no upload queue. Pick a speed from 0.25x to 3x, press the button and download the result.",
	},
	{
		question: "Which speeds can I choose?",
		answer:
			"0.25x, 0.5x, 0.75x, 1.25x, 1.5x, 2x and 3x. To get a speed in between, run the result through again at a second setting.",
	},
	{
		question: "How long does it take?",
		answer:
			"About as long as the new video lasts. The browser plays your video through and records it as it goes, so a 10 minute video at 2x takes about 5 minutes, and at 0.5x about 20 minutes.",
	},
	{
		question: "Does the video quality change?",
		answer:
			"The resolution stays the same, but the video is re-encoded at about 5 Mbps, so a very high-bitrate source can lose some detail.",
	},
	{
		question: "What is the biggest video I can use?",
		answer:
			"500 MB. It works best in Chrome or Edge on a computer. We have not verified Safari, Firefox or phones yet, so we do not promise them.",
	},
];

const breadcrumbs = [
	{ name: "Home", url: "https://screencap.co/" },
	{ name: "Free tools", url: "https://screencap.co/tools" },
	{ name: "Speed up or slow down a video", url: pageUrl },
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
			name: "Speed Up or Slow Down a Video",
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
			name: "Screencap Video Speed Changer",
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

export default function SpeedControllerPage() {
	const pageContent: ToolPageContent = {
		title: "Speed up or slow down a video",
		description:
			"To speed up a video, drop it into the tool below, pick a speed from 0.25x to 3x and press the button. It runs in your browser, so your file never leaves your device. It is free and needs no sign-up. It is a web page, not a browser extension, and works best in Chrome or Edge on a computer.",
		byline: "By Chris, Screencap Team",
		updated: "24 October 2026",
		privacyBadge: "Your file never leaves your device",
		heroImage: {
			src: "/assets/img/tools-speed-up-video-hero-1520.webp",
			alt: heroAlt,
		},
		sections: [
			{
				title: "How do I speed up a video?",
				body: `<p>You can speed up a video in three steps, with nothing to install.</p>
<ol>
<li><strong>Drop your video</strong> onto the tool above, or click to browse (up to 500 MB).</li>
<li><strong>Choose a speed</strong>: 1.25x, 1.5x, 2x or 3x.</li>
<li><strong>Press the button</strong>, wait for it to finish, then preview and download the new file.</li>
</ol>
<p>The resolution stays as it was. This is a video speed changer for files, so it changes the video you download, not how a page plays it.</p>`,
			},
			{
				title: "How do I slow a video down?",
				body: `<p>Slowing a video down works the same way: pick 0.75x, 0.5x or 0.25x instead.</p>
<p>At 0.25x a video lasts four times as long, so a 30 second clip becomes two minutes. Slowing a clip down does not add detail, so fast movement can look jerky at the lowest setting.</p>`,
				image: {
					src: "/assets/img/tools-speed-up-video-fig-1-1520.webp",
					alt: "a hare running ahead of a turtle on a film-strip road",
				},
			},
			{
				title: "Which speed should I pick?",
				body: `<p>Choose by how much time you want to save, or how closely you want to look.</p>
<ul>
<li><strong>1.25x or 1.5x</strong> for talks and tutorials. You save a fifth to a third of the time and speech stays easy to follow.</li>
<li><strong>2x</strong> for a long screen recording where little happens.</li>
<li><strong>3x</strong> for skimming, or a time-lapse feel.</li>
<li><strong>0.5x or 0.25x</strong> for checking a movement, a bug or a tricky step.</li>
</ul>`,
			},
			{
				title: "How do I speed up a video on iPhone?",
				body: `<p>On an iPhone, use the apps you already have. The Photos app can adjust the slow-motion part of clips recorded in Slo-mo mode, and iMovie has a speed control for clips on its timeline.</p>
<p>Apple's own guides have the current steps. Our tool is built for a computer browser, and we have not verified it on phones.</p>`,
			},
			{
				title: "Does it keep the sound?",
				body: `<p>Yes, where your browser records it. The sound is played and recorded along with the picture, so it is sped up or slowed down with it.</p>
<p>Check the preview before you download. If a video has no sound in the preview, the result will not have it either.</p>`,
				image: {
					src: "/assets/img/tools-speed-up-video-fig-2-1520.webp",
					alt: "a speaker with sound waves next to a speedometer dial",
				},
			},
			{
				title: "Why does it take as long as the video?",
				body: `<p>The tool plays your video through in real time and records it at the new speed, about 5 Mbps, so the wait is roughly the length of the finished video.</p>
<p>A 10 minute video at 2x takes about 5 minutes. At 0.5x the same video takes about 20. Keep the tab open while it works. Trim long videos first if you only need a part.</p>`,
			},
			{
				title: "Is it safe to change video speed here?",
				body: `<p>Your file never leaves your device. The speed change runs inside your browser tab, and your video is not uploaded to Screencap or anyone else.</p>
<p>That makes it fine for private or work videos. Many online video tools upload your file to their servers, so it is worth checking before you drop in anything sensitive.</p>`,
			},
		],
		featuresTitle: "What this video speed changer does",
		featuresDescription:
			"Small, specific and free. Every number below is what the tool really does.",
		features: [
			{
				title: "0 bytes uploaded",
				description:
					"The video is played and re-encoded in your browser, so it stays on your computer.",
			},
			{
				title: "7 speeds",
				description:
					"0.25x, 0.5x, 0.75x, 1.25x, 1.5x, 2x and 3x, for slowing down and speeding up.",
			},
			{
				title: "Resolution kept",
				description:
					"Your video keeps its size. It is re-encoded at about 5 Mbps, with sound where the browser records it.",
			},
			{
				title: "Up to 500 MB",
				description: "Drop in a video up to 500 MB. Free and no sign-up.",
			},
		],
		faqs,
		relatedTitle: "More free video tools",
		relatedTools: [
			{
				title: "MOV to MP4",
				href: "/tools/convert/mov-to-mp4",
				description: "Turn a QuickTime or iPhone MOV into an MP4.",
			},
			{
				title: "MP4 to GIF",
				href: "/tools/convert/mp4-to-gif",
				description: "Turn a short clip into an animated GIF.",
			},
			{
				title: "All free tools",
				href: "/tools",
				description: "Small video helpers that run in your browser.",
			},
		],
		cta: {
			title: "Record your screen, share a link",
			description:
				"Screencap is a free screen recorder for Mac and the browser. Record, get a link that plays instantly, and on the Mac app switch on end-to-end encryption so only people with the link can watch.",
			buttonText: "Sign up free",
			buttonHref: "/signup?from=tool-speed-up-video",
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
				toolComponent={<SpeedController />}
			/>
		</>
	);
}

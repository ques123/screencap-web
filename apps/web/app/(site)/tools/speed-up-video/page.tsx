import type { Metadata } from "next";
import { SpeedController } from "@/components/tools/SpeedController";
import { ToolsPageTemplate } from "@/components/tools/ToolsPageTemplate";
import type { ToolPageContent } from "@/components/tools/types";

// sources (checked 2026-10-24):
// https://support.apple.com/guide/imovie-iphone/adjust-video-speed-kna47ca84b07/ios (iMovie on iPhone speed slider)
// https://support.apple.com/en-us/104968 (Photos: edit the slo-mo part; slow down >30 fps video on iOS 18 and later)

const pageUrl = "https://screencap.co/tools/speed-up-video";
const heroJpg =
	"https://screencap.co/assets/img/tools-speed-up-video-hero-1520.jpg";
const pageTitle = "Speed Up Video Online Free: Change Speed | Screencap";
const pageDescription =
	"Speed up or slow down a video in your browser, from 0.25x to 3x. Free, no account, and your video is never uploaded. Works best in Chrome or Edge.";
const heroAlt =
	"a speedometer dial beside a play-button video with motion streaks, a turtle and a hare";

const appleIMovieSpeed =
	"https://support.apple.com/guide/imovie-iphone/adjust-video-speed-kna47ca84b07/ios";
const applePhotosVideo = "https://support.apple.com/en-us/104968";

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
			"Yes. This video speed changer is free, needs no account and works on the file right there in your browser. Pick a speed from 0.25x to 3x, press the button and download the result.",
	},
	{
		question: "Which speeds can I choose?",
		answer:
			"0.25x, 0.5x, 0.75x, 1.25x, 1.5x, 2x and 3x. For another speed, run the result through a second time: 1.5x twice gives 2.25x. Each pass re-encodes the video, so expect a little softening.",
	},
	{
		question: "How long does it take?",
		answer:
			"About as long as the new video lasts. The browser plays your video through and records it as it goes, so a 10 minute video at 2x takes about 5 minutes, and at 0.5x about 20 minutes.",
	},
	{
		question: "Does the video quality change?",
		answer:
			"The resolution stays the same. The video is re-encoded at about 5 Mbps, so a very high-bitrate source, such as 4K camera footage, can lose some detail.",
	},
	{
		question: "What is the biggest video I can use?",
		answer:
			"500 MB. For the most reliable results, use Chrome or Edge on a computer, and keep the tab open until it finishes.",
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
			author: { "@type": "Person", name: "Chris", worksFor: org },
			publisher: org,
			datePublished: "2026-10-24",
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
			"To speed up a video, drop it into the tool below, pick a speed from 0.25x to 3x and press the button. The work happens in your browser, so your file never leaves your device. It is free and needs no account or extension. It works best in Chrome or Edge on a computer.",
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
<li><strong>Choose a speed</strong> of 1.25x, 1.5x, 2x or 3x.</li>
<li><strong>Press Speed Up Video</strong>, wait for it to finish, then preview and download the new file.</li>
</ol>
<p>The resolution stays as it was. You get an MP4 or a WebM file, depending on your browser and the video you start with. This changes the file itself, so the new speed holds wherever you send it.</p>`,
			},
			{
				title: "How do I slow a video down?",
				body: `<p>Slowing a video down works the same way. Pick 0.75x, 0.5x or 0.25x instead.</p>
<p>At 0.25x a video lasts four times as long, so a 30 second clip becomes two minutes. Slowing down does not create new frames, so fast movement can look jerky at 0.25x.</p>`,
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
				title: "How do I speed up or slow down a video on iPhone?",
				body: `<p>On an iPhone, Apple's free iMovie app can do both: select the clip in your project and drag its speed slider, as <a href="${appleIMovieSpeed}">Apple's iMovie guide</a> shows. The Photos app can change which part of a Slo-mo video plays slowly, and from iOS 18 it can slow down videos recorded at more than 30 fps (<a href="${applePhotosVideo}">Apple's guide to editing videos</a>).</p>
<p>This tool is built for a computer browser. To use it on a phone video, move the file to your computer first.</p>`,
			},
			{
				title: "Does it keep the sound?",
				body: `<p>Usually, yes. The sound plays through with the picture at the new speed and is recorded into the new file.</p>
<p>A few browsers cannot save sound in the format they pick, so play the result before you download it.</p>`,
				image: {
					src: "/assets/img/tools-speed-up-video-fig-2-1520.webp",
					alt: "a speaker with sound waves next to a speedometer dial",
				},
			},
			{
				title: "Why does it take as long as the video?",
				body: `<p>The tool plays your video through in real time and records it at the new speed, about 5 Mbps, so the wait is roughly the length of the finished video.</p>
<p>A 10 minute video at 2x takes about 5 minutes. At 0.5x the same video takes about 20. Keep the tab open while it works, and trim long videos first if you only need a part.</p>`,
			},
			{
				title: "Is it safe to change video speed here?",
				body: `<p>Yes. Your video is played and recorded again inside this browser tab, and it is never sent to Screencap or to anyone else.</p>
<p>That suits recordings of meetings, lessons or anything with faces in it. Many online video editors upload your file to their servers first, so check before you hand one a private clip.</p>`,
			},
		],
		featuresTitle: "What this video speed changer does",
		featuresDescription:
			"What you can set, what you get back, and the size limit.",
		features: [
			{
				title: "Nothing to upload",
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
					"Your video keeps its size and is re-encoded at about 5 Mbps, usually with its sound.",
			},
			{
				title: "Up to 500 MB",
				description: "Drop in a video of up to 500 MB. Free, with no account.",
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
			title: "Recording a walkthrough?",
			description:
				"Record it with Screencap instead. In the Mac app's Instant mode the share link is ready the moment you stop, and it plays in any browser. On Windows or Linux, record in Chrome or Edge.",
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

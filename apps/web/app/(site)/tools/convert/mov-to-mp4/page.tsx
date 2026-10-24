import type { Metadata } from "next";
import { MediaFormatConverter } from "@/components/tools/MediaFormatConverter";
import { ToolsPageTemplate } from "@/components/tools/ToolsPageTemplate";
import type { ToolPageContent } from "@/components/tools/types";

// sources (checked 2026-10-24):
// https://support.apple.com/en-us/120755 (Convert a MOV file to MP4 on Mac: rename H.264 MOVs, or iMovie Export File)
// https://support.apple.com/guide/quicktime-player/export-movies-qtp20e395859/mac (QuickTime exports .mov only)

const pageUrl = "https://screencap.co/tools/convert/mov-to-mp4";
const heroJpg =
	"https://screencap.co/assets/img/tools-mov-to-mp4-hero-1520.jpg";
const heroAlt =
	"A phone sticker sending a clapperboard into a play-button video that fits a laptop";
const pageTitle = "MOV to MP4 Converter: Free and Private | Screencap";
const pageDescription =
	"Convert MOV to MP4 free in your browser. Your file never leaves your device and there is no watermark. Handles QuickTime and iPhone videos.";

const appleMovGuide = "https://support.apple.com/en-us/120755";
const appleQuickTimeGuide =
	"https://support.apple.com/guide/quicktime-player/export-movies-qtp20e395859/mac";

export const metadata: Metadata = {
	title: pageTitle,
	description: pageDescription,
	alternates: { canonical: pageUrl },
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
};

const faqs = [
	{
		question: "How do I convert MOV to MP4 for free?",
		answer:
			"Use the converter on this page. Drop your .mov file in, press Convert and download the MP4. It costs nothing, needs no account and adds no watermark, for files up to 500 MB.",
	},
	{
		question: "Is this MOV to MP4 converter safe for private videos?",
		answer:
			"Yes. The conversion runs in your browser, so the file is not uploaded to Screencap or anyone else. Many online converters do upload your file to their servers, so it is worth checking before you use one.",
	},
	{
		question: "Can I just rename .mov to .mp4?",
		answer:
			"Sometimes. Apple says that if the video inside uses H.264, changing the extension from .mov to .mp4 works. For other codecs, such as HEVC, the video needs converting, which this page does for you.",
	},
	{
		question: "Does QuickTime Player save MOV as MP4?",
		answer:
			"No. According to Apple, QuickTime Player's Export As always writes a .mov file. Apple's free iMovie app can export an MP4, or you can use the converter on this page.",
	},
	{
		question: "Does converting MOV to MP4 reduce quality?",
		answer:
			"Not when the video is already H.264, because it is usually copied into the MP4 untouched. Other codecs, such as HEVC from an iPhone, are re-encoded to H.264, which can lose a little detail. The resolution stays the same either way.",
	},
	{
		question: "Why is my MOV file not playing?",
		answer:
			"MOV is Apple's QuickTime container, and some players cannot decode the codec inside it, such as HEVC from an iPhone. Converting to an H.264 MP4 gives you a file most players open.",
	},
];

const org = {
	"@type": "Organization",
	"@id": "https://screencap.co/#org",
	name: "Screencap",
	url: "https://screencap.co/",
};

const graph = {
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
					item: "https://screencap.co/tools",
				},
				{
					"@type": "ListItem",
					position: 3,
					name: "MOV to MP4",
					item: pageUrl,
				},
			],
		},
		{
			"@type": "WebPage",
			url: pageUrl,
			name: "MOV to MP4 Converter",
			description: pageDescription,
			primaryImageOfPage: heroJpg,
			image: heroJpg,
			author: { "@type": "Person", name: "Chris", worksFor: org },
			publisher: org,
			datePublished: "2026-10-24",
			dateModified: "2026-10-24",
		},
		{
			"@type": "WebApplication",
			name: "Screencap MOV to MP4 Converter",
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

export default function MOVToMP4Page() {
	const pageContent: ToolPageContent = {
		title: "MOV to MP4 Converter: free and private",
		description:
			"To convert MOV to MP4, drop your .mov file into the converter below, press Convert and download the MP4. Everything happens in your browser, so your video is never uploaded. It is free for files up to 500 MB, with no account and no watermark. Use Chrome or Edge on a computer for best results.",
		privacyBadge: "Your file never leaves your device",
		byline: "By Chris, Screencap Team",
		updated: "24 October 2026",
		heroImage: {
			src: "/assets/img/tools-mov-to-mp4-hero-1520.webp",
			alt: heroAlt,
		},
		sections: [
			{
				title: "How do I convert MOV to MP4?",
				body: "<p>Use the converter above. <strong>Drop your .mov file in, press Convert, then download the MP4.</strong> The resolution stays as it was.</p><ol><li>Open this page in Chrome or Edge on a computer.</li><li>Drag in your MOV file, or click to browse. The limit is 500 MB.</li><li>Press Convert and wait for the progress bar to finish.</li><li>Download the MP4.</li></ol><p>If the video inside is already H.264, it is usually copied across as it is, which is quick. Other codecs are re-encoded to H.264, which takes longer.</p>",
			},
			{
				title: "How do I convert MOV to MP4 on a Mac?",
				body: `<p>Start by checking the codec. In Finder, select the file, choose <strong>File &gt; Get Info</strong> and look under More Info. If it says H.264, Apple's guide to <a href="${appleMovGuide}">converting a MOV file to MP4 on Mac</a> says you can simply change the extension from .mov to .mp4.</p><p>For other codecs, Apple suggests its free iMovie app: import the clip, then choose Share and Export File to save an MP4. QuickTime Player will not do it, because its <a href="${appleQuickTimeGuide}">Export As</a> always writes a .mov.</p><p>Or skip both and use the converter above in Chrome or Edge. Screen recordings made with QuickTime are MOV files too, so the same steps apply.</p>`,
				image: {
					src: "/assets/img/tools-mov-to-mp4-fig-1-1520.webp",
					alt: "a laptop with a film strip going into a folder and a play button coming out",
				},
			},
			{
				title: "How do I convert MOV to MP4 on Windows?",
				body: "<p>Open this page in a current version of Chrome or Edge and use the converter above. There is no app to install and no account to create. You get an H.264 MP4, the format most Windows players, editors and websites accept.</p>",
			},
			{
				title: "Why won't my MOV file play?",
				body: "<p>MOV is Apple's QuickTime container, and MP4 is a standard format closely related to it. <strong>The usual problem is the codec inside the file, not the .mov extension.</strong> An iPhone video, for example, may use HEVC, which some players cannot decode.</p><p>Converting to an H.264 MP4 gives you a file that most players and upload forms accept.</p>",
			},
			{
				title: "Does converting MOV to MP4 lose quality?",
				body: "<p>It depends on what is inside the MOV. <strong>H.264 video is usually copied into the MP4 without re-encoding</strong>, so nothing is lost. HEVC and other codecs are decoded and written again as H.264, which can soften fine detail.</p><p>Either way the resolution is kept, so a 1080p MOV comes out as a 1080p MP4. If you need a perfect copy of an HEVC original, keep the MOV and use the MP4 for sharing.</p>",
			},
			{
				title: "Can I convert iPhone videos from MOV to MP4?",
				body: "<p>Yes, where your browser can decode them. iPhones save video as MOV, often with HEVC. Chrome and Edge can decode HEVC on many computers, but not all, so a file that will not open here may need another route, such as iMovie on a Mac.</p><p>Move the video to your computer first, then drop it into the converter above.</p>",
			},
			{
				title: "Is it private to convert MOV to MP4 here?",
				body: "<p>Yes. <strong>Your MOV is converted on your own computer, and the file is not uploaded to Screencap or anyone else.</strong> Phone videos of your family or a screen recording of a client project stay with you.</p><p>Plenty of online converters work by uploading your file to their servers, so read how a site handles video before you use it.</p>",
				image: {
					src: "/assets/img/tools-mov-to-mp4-fig-2-1520.webp",
					alt: "a padlock on a laptop, the file stays on your computer",
				},
			},
		],
		featuresTitle: "What this MOV to MP4 converter does",
		featuresDescription:
			"A free MOV to MP4 converter that works on your own computer.",
		features: [
			{
				title: "Runs in your browser",
				description:
					"The file stays on your device. Nothing is uploaded to Screencap.",
			},
			{
				title: "Free, no account",
				description:
					"Convert as many .mov files as you like, up to 500 MB each, with no watermark.",
			},
			{
				title: "H.264 MP4 output",
				description:
					"H.264 video is usually copied as it is. HEVC and other codecs are re-encoded to H.264, at the original resolution.",
			},
			{
				title: "Mac and Windows",
				description:
					"Works in Chrome or Edge on a computer, so there is no app to install.",
			},
		],
		faqs,
		cta: {
			title: "Record straight to a link",
			description:
				"Screencap exports your screen recordings as MP4, so there is nothing to convert. Or skip the file and share a link that plays in any browser.",
			buttonText: "Sign up free",
			buttonHref: "/signup?from=tool-mov-to-mp4",
			secondaryButtonText: "Download for Mac",
			secondaryButtonHref: "/download",
		},
	};

	return (
		<>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD
				dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
			/>
			<ToolsPageTemplate
				content={pageContent}
				toolComponent={
					<MediaFormatConverter initialConversionPath="mov-to-mp4" />
				}
			/>
		</>
	);
}

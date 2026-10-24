import type { Metadata } from "next";
import { MediaFormatConverter } from "@/components/tools/MediaFormatConverter";
import { ToolsPageTemplate } from "@/components/tools/ToolsPageTemplate";
import type { ToolPageContent } from "@/components/tools/types";

const pageUrl = "https://screencap.co/tools/convert/mov-to-mp4";
const heroJpg =
	"https://screencap.co/assets/img/tools-mov-to-mp4-hero-1520.jpg";
const heroAlt =
	"A phone sticker sending a clapperboard into a play-button video that fits a laptop";
const pageTitle = "MOV to MP4 Converter: Free, Private, In Your Browser";
const pageDescription =
	"Convert MOV to MP4 free in your browser. Your file never leaves your device, with no sign-up and no watermark. Works with iPhone and Mac videos.";

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
			"Use the converter on this page. Drop your .mov file in, press Convert and download the MP4. It costs nothing, needs no sign-up and adds no watermark. Files up to 500 MB are accepted.",
	},
	{
		question: "Is this MOV to MP4 converter safe for private videos?",
		answer:
			"The conversion runs in your browser, so the file is not uploaded to Screencap or anyone else. That makes it suitable for work or personal videos. Many online converters do upload your file to their servers, so it is worth checking before you use one.",
	},
	{
		question: "Can I convert .mov to MP4 on Mac without installing anything?",
		answer:
			"Yes. Open this page in Chrome or Edge on your Mac and use the converter. QuickTime Player and iMovie are also built in, but they do not always save a file ending in .mp4.",
	},
	{
		question: "Can I convert MOV to MP4 on Windows?",
		answer:
			"Yes. The converter works in Chrome or Edge on Windows, so there is nothing to install. It re-encodes the video to H.264 in an MP4 file.",
	},
	{
		question: "Does converting MOV to MP4 reduce quality?",
		answer:
			"It re-encodes the video to H.264, so it is not a lossless copy and some detail can be lost. The resolution stays the same as your original.",
	},
	{
		question: "Why is my MOV file not playing?",
		answer:
			"MOV is Apple's QuickTime container, and some players cannot decode the codec inside it, such as HEVC from an iPhone. Converting to an H.264 MP4 gives you a file most players open.",
	},
];

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
					item: "https://screencap.co",
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
			name: pageTitle,
			description: pageDescription,
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
		title: "MOV to MP4 converter, free and private",
		description:
			"To convert MOV to MP4, drop your .mov file into the converter above, press Convert and download the MP4. It runs in your browser, so your video is never uploaded. It is free, needs no sign-up and adds no watermark. Files up to 500 MB work best in Chrome or Edge on a computer.",
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
				body: "<p>Use the converter above. <strong>Drop your .mov file in, press Convert, then download the MP4.</strong> The video is re-encoded to H.264 inside an MP4 file, and the resolution stays as it was.</p><ol><li>Open this page in Chrome or Edge on a computer.</li><li>Drag in your MOV file, or click to browse. The limit is 500 MB.</li><li>Press Convert and wait for the progress bar to finish.</li><li>Download the MP4.</li></ol><p>There is no sign-up and no watermark.</p>",
			},
			{
				title: "How do I convert MOV to MP4 on a Mac?",
				body: "<p>You can do it in the browser, or with the apps already on your Mac. QuickTime Player has <strong>File &gt; Export As</strong>, and iMovie can export a finished video. Both give you resolution choices, but check the file extension they write, because they do not always produce a .mp4.</p><p>If you want a file that ends in .mp4 without installing anything, open this page in Chrome or Edge and use the converter above. Screen recordings made with QuickTime are MOV files too, so the same steps apply.</p>",
				image: {
					src: "/assets/img/tools-mov-to-mp4-fig-1-1520.webp",
					alt: "a laptop with a film strip going into a folder and a play button coming out",
				},
			},
			{
				title: "How do I convert MOV to MP4 on Windows?",
				body: "<p>Open this page in Chrome or Edge and use the converter above. It needs no app and no account, so it works on any Windows computer with a current browser. The result is an H.264 MP4, the format most Windows players, editors and websites accept.</p>",
			},
			{
				title: "Why won't my MOV file play?",
				body: "<p>MOV is Apple's QuickTime container. MP4 is a related, open format that nearly every player accepts. <strong>The usual problem is the codec inside the file, not the .mov extension.</strong> An iPhone video, for example, may use HEVC, which some players cannot decode.</p><p>Converting to an H.264 MP4 gives you a file that most players, phones and upload forms open without fuss.</p>",
			},
			{
				title: "Does converting MOV to MP4 lose quality?",
				body: "<p>A little can, because this is a re-encode and not a lossless rewrap. The converter decodes your video and writes it again as H.264. <strong>The resolution is kept</strong>, so a 1080p MOV comes out as a 1080p MP4.</p><p>If you need a perfect copy of the original, keep the MOV as well and use the MP4 for sharing.</p>",
			},
			{
				title: "Can I convert iPhone videos from MOV to MP4?",
				body: "<p>Yes, where your browser can decode them. iPhones save video as MOV, often with HEVC. Chrome and Edge can decode HEVC on many computers, but not all, so a file that will not open here may need another route.</p><p>Move the video to your computer first, then drop it into the converter above.</p>",
			},
			{
				title: "Is it private to convert MOV to MP4 here?",
				body: "<p>Yes. <strong>The conversion runs in your browser, and the file is not uploaded to Screencap or anyone else.</strong> That makes it fine for work videos and personal clips.</p><p>Many online converters upload your file to their servers, so check how a site handles your video before you use it.</p>",
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
				title: "Free, no sign-up",
				description:
					"Convert as many .mov files as you like, with no account and no watermark.",
			},
			{
				title: "H.264 MP4 output",
				description:
					"The video is re-encoded to H.264 in an MP4 file, at the original resolution.",
			},
			{
				title: "Mac and Windows",
				description:
					"Works in Chrome or Edge on a computer, so there is no app to install.",
			},
		],
		faqs,
		cta: {
			title: "Record straight to MP4",
			description:
				"Screencap records straight to MP4, so there is nothing to convert. Record your screen, then share a link that plays in any browser.",
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

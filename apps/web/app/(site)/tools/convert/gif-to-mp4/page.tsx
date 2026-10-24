import type { Metadata } from "next";
import { GifToMp4Converter } from "@/components/tools/GifToMp4Converter";
import { ToolsPageTemplate } from "@/components/tools/ToolsPageTemplate";
import type { ToolPageContent } from "@/components/tools/types";
import { ogImageUrl } from "@/lib/og/url";
import { createBreadcrumbSchema } from "@/utils/web-schema";

const ogImage = ogImageUrl({
	title: "Convert GIF to MP4 : free, in your browser",
	tag: "Tools",
});

const pageTitle = "GIF to MP4 Converter | Free, in Your Browser | Screencap";

export const metadata: Metadata = {
	title: pageTitle,
	description:
		"Convert a GIF to an MP4 video in your browser. Free, private, nothing is uploaded. Keeps the real frame timing and works in QuickTime, Safari and Instagram.",
	keywords: [
		"gif to mp4",
		"convert gif to mp4",
		"gif to mp4 converter",
		"gif to video",
		"gif to mp4 no upload",
		"free gif to mp4",
	],
	openGraph: {
		title: pageTitle,
		description:
			"Turn a GIF into an H.264 MP4 in your browser. No uploads, no sign-up, no watermark.",
		url: "https://screencap.co/tools/convert/gif-to-mp4",
		siteName: "Screencap",
		images: [
			{
				url: ogImage,
				width: 1200,
				height: 630,
				alt: "Convert GIF to MP4 : free, in your browser",
			},
		],
		locale: "en_US",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: pageTitle,
		description:
			"Turn a GIF into an H.264 MP4 in your browser. No uploads, no sign-up.",
		images: [ogImage],
	},
	alternates: {
		canonical: "https://screencap.co/tools/convert/gif-to-mp4",
	},
};

const faqs = [
	{
		question: "How do I convert a GIF to MP4?",
		answer:
			"Drag your GIF onto the converter or click to browse, choose your settings, then click Convert to MP4. When it finishes, preview the video and click Download MP4. Everything runs in your browser, so your GIF is never uploaded.",
	},
	{
		question: "Is the GIF to MP4 converter free?",
		answer:
			"Yes. It is free, has no watermark and needs no sign-up. It runs on your own device, so there is no limit on how many GIFs you convert.",
	},
	{
		question: "Is my GIF uploaded anywhere?",
		answer:
			"No. Your file never leaves your device. The GIF is decoded and encoded to MP4 by your browser, and the result is created locally for you to download.",
	},
	{
		question: "Why convert a GIF to MP4?",
		answer:
			"MP4 files are usually far smaller than the same animation as a GIF, and they play smoothly in QuickTime, Safari, Instagram, WhatsApp and most other apps that handle video better than GIFs.",
	},
	{
		question: "Will the MP4 loop like a GIF?",
		answer:
			"MP4 files do not loop on their own. Use the Repeat setting to play the animation 1, 2, 3, 5 or 10 times inside the file. Most players and social apps can also loop the video for you.",
	},
	{
		question: "What happens to transparent GIFs?",
		answer:
			"MP4 does not support transparency, so transparent areas are filled with a background colour. It is white by default and you can pick any colour before converting.",
	},
	{
		question: "Does it keep the GIF's frame timing?",
		answer:
			"Yes. Each frame keeps its own delay from the GIF. Frames with a delay of 0 or under 20 ms are treated as 100 ms, which is how browsers play them.",
	},
	{
		question: "What size and codec does the MP4 use?",
		answer:
			"The video is encoded as H.264. Width and height are rounded to even numbers, which H.264 requires. Large GIFs are scaled down to at most 1920 pixels wide by default, and you can choose 1080, 720 or 480 instead. The converter never scales up.",
	},
	{
		question: "Which browsers does it work in?",
		answer:
			"Recent versions of Chrome, Edge and Safari that can encode H.264 video. If your browser can't, the converter tells you instead of making a different kind of file. The maximum GIF size is 100 MB.",
	},
];

const howToSteps = [
	{
		name: "Add your GIF",
		text: "Drag and drop a GIF file (up to 100 MB) into the upload area, or click to browse your files.",
	},
	{
		name: "Choose your settings",
		text: "Pick a maximum width, how many times the animation repeats, and the background colour used for transparent areas.",
	},
	{
		name: "Convert and download",
		text: "Click Convert to MP4, preview the result, then click Download MP4. Your GIF is processed in your browser and never uploaded.",
	},
];

const faqStructuredData = {
	"@context": "https://schema.org",
	"@type": "FAQPage",
	mainEntity: faqs.map((faq) => ({
		"@type": "Question",
		name: faq.question,
		acceptedAnswer: {
			"@type": "Answer",
			text: faq.answer,
		},
	})),
};

const howToStructuredData = {
	"@context": "https://schema.org",
	"@type": "HowTo",
	name: "How to Convert a GIF to MP4 Online",
	description:
		"Convert a GIF to an H.264 MP4 video for free using Screencap's browser-based converter. No upload required.",
	step: howToSteps.map((step, index) => ({
		"@type": "HowToStep",
		position: index + 1,
		name: step.name,
		text: step.text,
	})),
	tool: {
		"@type": "HowToTool",
		name: "A modern web browser (Chrome, Edge or Safari)",
	},
};

const breadcrumbSchema = createBreadcrumbSchema([
	{ name: "Home", url: "https://screencap.co" },
	{ name: "Tools", url: "https://screencap.co/tools" },
	{
		name: "GIF to MP4 Converter",
		url: "https://screencap.co/tools/convert/gif-to-mp4",
	},
]);

export default function GIFToMP4Page() {
	const pageContent: ToolPageContent = {
		title: "GIF to MP4 Converter",
		description:
			"Turn a GIF into an MP4 video directly in your browser. Free, private and no installation required.",
		featuresTitle: "Why Use This GIF to MP4 Converter",
		featuresDescription:
			"A free and private way to turn GIFs into MP4 videos, entirely in your browser with no uploads.",
		features: [
			{
				title: "100% Browser-Based",
				description:
					"The conversion runs locally in your browser. Your GIF is never uploaded, so it stays on your device the whole time.",
			},
			{
				title: "Real Frame Timing",
				description:
					"Every frame keeps its own delay from the GIF, so animations with uneven timing play at the right speed.",
			},
			{
				title: "H.264 MP4 Output",
				description:
					"The output is an H.264 MP4 that plays in QuickTime, Safari, Instagram and WhatsApp, and is usually much smaller than the GIF.",
			},
			{
				title: "Repeat, Resize and Background",
				description:
					"Repeat the animation up to 10 times, scale it down to 1080, 720 or 480 pixels wide, and choose the colour that fills transparent areas.",
			},
			{
				title: "No Sign-Up or Installation",
				description:
					"No software, extensions or accounts. Open the page, add a GIF and download your MP4.",
			},
			{
				title: "Unlimited Free Conversions",
				description:
					"Convert as many GIFs as you like with no daily limits and no watermarks.",
			},
		],
		faqs,
		cta: {
			title: "Record your screen, share a link",
			description:
				"Screencap is a free screen recorder for Mac. Record, get a share link instantly, and turn on end-to-end encryption so only people with the link can watch. No time limits. Screencap records straight to MP4, so there is nothing to convert.",
			buttonText: "Download Screencap free",
			buttonHref: "/download",
			secondaryButtonText: "Sign up free",
			secondaryButtonHref: "/signup",
		},
	};

	return (
		<>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(breadcrumbSchema),
				}}
			/>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(faqStructuredData),
				}}
			/>
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(howToStructuredData),
				}}
			/>
			<ToolsPageTemplate
				content={pageContent}
				toolComponent={<GifToMp4Converter />}
			/>
		</>
	);
}

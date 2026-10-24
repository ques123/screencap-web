import type { Metadata } from "next";
import { MediaFormatConverter } from "@/components/tools/MediaFormatConverter";
import { ToolsPageTemplate } from "@/components/tools/ToolsPageTemplate";
import type { ToolPageContent } from "@/components/tools/types";

// sources (checked 2026-10-24): https://ffmpeg.org/ffmpeg-filters.html#palettegen

const pageUrl = "https://screencap.co/tools/convert/mp4-to-gif";
const heroJpg =
	"https://screencap.co/assets/img/tools-mp4-to-gif-hero-1520.jpg";
const pageTitle = "MP4 to GIF Converter: Free, High Quality | Screencap";
const pageDescription =
	"Convert MP4 to GIF in your browser, free and with no watermark. Your video is never uploaded. Set the frame rate, width and quality yourself.";
const heroAlt =
	"A glossy film-strip sticker flowing into looping picture-frame stickers";

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
		question: "Is there a free MP4 to GIF converter with no watermark?",
		answer:
			"Yes, this one. It is free, needs no account and leaves your GIF exactly as you set it, with no logo stamped on. Because it runs on your own computer, you never wait for an upload either.",
	},
	{
		question: "How long can the GIF be?",
		answer:
			"The GIF holds at most 15 seconds' worth of frames at the frame rate you choose, so 15 fps gives 225 frames. A longer video is sampled across its whole length and the GIF plays faster than the original. Trim long clips first for a true-speed GIF.",
	},
	{
		question: "What is the biggest MP4 I can convert?",
		answer:
			"500 MB. Short clips convert quickest, because the browser has to draw and encode every frame on your computer.",
	},
	{
		question: "Does it work on a phone?",
		answer:
			"For reliable results, use Chrome or Edge on a computer. The converter relies on your browser's built-in video features, and a browser that lacks them shows an error message instead of making a broken GIF.",
	},
	{
		question: "Can I make an animated GIF from a screen recording?",
		answer:
			"Yes, any MP4 your browser can play works, including screen recordings. Their flat colours suit the GIF format well. Keep the clip short and the width modest for a small file.",
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
	{ name: "MP4 to GIF", url: pageUrl },
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
			name: "MP4 to GIF Converter",
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
			name: "Screencap MP4 to GIF Converter",
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

export default function MP4ToGIFPage() {
	const pageContent: ToolPageContent = {
		title: "MP4 to GIF Converter: free and high quality",
		description:
			"To convert MP4 to GIF, drop your video into the converter below, adjust the settings if you like, and press Convert. The GIF is made inside your browser, so your file never leaves your device. It is free, adds no watermark and needs no account. It works best in Chrome or Edge on a computer.",
		byline: "By Chris, Screencap Team",
		updated: "24 October 2026",
		privacyBadge: "Your file never leaves your device",
		heroImage: {
			src: "/assets/img/tools-mp4-to-gif-hero-1520.webp",
			alt: heroAlt,
		},
		sections: [
			{
				title: "How do I convert MP4 to GIF?",
				body: `<p>You can convert an MP4 to a GIF in three steps, with no app to install.</p>
<ol>
<li><strong>Drop your MP4</strong> onto the converter above, or click to browse (up to 500 MB).</li>
<li><strong>Choose your settings</strong>, or leave the defaults of 15 fps and 1280 px wide.</li>
<li><strong>Press Convert</strong>, then download the GIF when the progress bar finishes.</li>
</ol>
<p>A short clip is done quickly. Longer ones take more time, because your browser draws and encodes every frame itself.</p>`,
			},
			{
				title: "What settings make a good GIF?",
				body: `<p>Frame rate and width matter most. Both change the file size far more than quality does.</p>
<ul>
<li><strong>Frame rate: 5 to 30 fps</strong> (default 15). Around 15 reads as smooth for most clips.</li>
<li><strong>Max width: 240 to 1280 px</strong> (default 1280). A video wider than this is scaled down, never up.</li>
<li><strong>Quality: 1 to 20</strong> (default 18). Lower numbers look better and make bigger files.</li>
<li><strong>Dithering</strong> is optional. It smooths gradients at the cost of a larger file.</li>
</ul>`,
				image: {
					src: "/assets/img/tools-mp4-to-gif-fig-1-1520.webp",
					alt: "three slider knobs beside a picture frame, for GIF settings",
				},
			},
			{
				title: "How do I make a high quality GIF from an MP4?",
				body: `<p>For an MP4 to GIF in high quality, keep the width near the original, set quality to between 1 and 5, and turn dithering on for skies, skin and other gradients.</p>
<p>A GIF can only use 256 colours per image, so photographic video will always look a little grainy. Screen recordings, with their flat colours, convert far better.</p>`,
			},
			{
				title: "Why is my GIF bigger than the MP4?",
				body: `<p>GIFs are usually much bigger than the MP4 they came from, because the format stores frames far less efficiently than modern video.</p>
<p>To shrink one, lower the frame rate first, then the max width, then raise the quality number. Halving the width cuts the pixels in each frame to a quarter.</p>
<p>If the place you are posting to accepts video, an MP4 is almost always the better choice.</p>`,
				image: {
					src: "/assets/img/tools-mp4-to-gif-fig-2-1520.webp",
					alt: "a heavy picture frame outweighing a slim film strip on a seesaw, for GIF file size",
				},
			},
			{
				title: "How do I convert MP4 to GIF on Mac or Windows?",
				body: `<p>Open this page in Chrome or Edge, drop the file in and convert. The steps are identical on a Mac and on a Windows PC, because the converter is a web page and nothing gets installed.</p>
<p>It uses your browser's built-in video features, so a very old browser shows a message instead of converting.</p>`,
			},
			{
				title: "Is it safe to convert videos here?",
				body: `<p>Yes. Your MP4 is read and turned into a GIF inside this browser tab, and the video is never sent to Screencap or to anyone else.</p>
<p>So a clip from a work meeting or a family video is fine to use. Many online converters upload your file to their servers, so check how a site works before you give it anything sensitive.</p>`,
			},
			{
				title: "Can I convert MP4 to GIF with ffmpeg?",
				body: `<p>Yes. If you already use a terminal, this command builds a 15 fps, 480 px wide GIF with a custom colour palette: <code>ffmpeg -i input.mp4 -vf "fps=15,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" output.gif</code></p>
<p>The palette filters are described in the <a href="https://ffmpeg.org/ffmpeg-filters.html#palettegen">ffmpeg documentation</a>. This page does the same job without the command line.</p>`,
			},
		],
		featuresTitle: "What this MP4 to GIF converter does",
		featuresDescription:
			"Four facts about the converter, each taken from how it actually works.",
		features: [
			{
				title: "0 bytes uploaded",
				description:
					"Frames are drawn and encoded in your browser, so the video stays on your computer.",
			},
			{
				title: "3 sliders and a switch",
				description:
					"Frame rate 5 to 30 fps, max width 240 to 1280 px, quality 1 to 20, plus optional dithering.",
			},
			{
				title: "15 seconds of frames",
				description:
					"The GIF holds up to 15 seconds' worth of frames at your chosen frame rate.",
			},
			{
				title: "Up to 500 MB",
				description:
					"Drop in a source MP4 of up to 500 MB. Free, with no watermark.",
			},
		],
		faqs,
		relatedTitle: "More free video tools",
		relatedTools: [
			{
				title: "GIF to MP4",
				href: "/tools/convert/gif-to-mp4",
				description: "Turn a GIF into a video, usually a much smaller file.",
			},
			{
				title: "MOV to MP4",
				href: "/tools/convert/mov-to-mp4",
				description: "Turn a QuickTime or iPhone MOV into an MP4.",
			},
			{
				title: "All free tools",
				href: "/tools",
				description: "Small video helpers that run in your browser.",
			},
		],
		cta: {
			title: "Skip the GIF. Share a link.",
			description:
				"Screencap records your screen and gives you a link that plays in any browser, so there is no heavy GIF to attach. It is free, on the Mac or in Chrome and Edge.",
			buttonText: "Sign up free",
			buttonHref: "/signup?from=tool-mp4-to-gif",
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
				toolComponent={
					<MediaFormatConverter initialConversionPath="mp4-to-gif" />
				}
			/>
		</>
	);
}

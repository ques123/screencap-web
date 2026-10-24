"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type {
	ToolImage,
	ToolPageContent,
	ToolRelatedLink,
} from "@/components/tools/types";

const DEFAULT_PRIVACY = "Your file never leaves your device";

const ALL_TOOLS: ToolRelatedLink[] = [
	{ title: "MP4 to GIF", href: "/tools/convert/mp4-to-gif" },
	{ title: "MOV to MP4", href: "/tools/convert/mov-to-mp4" },
	{ title: "Video speed controller", href: "/tools/video-speed-controller" },
];

const renderHTML = (content: string) => {
	const styled = content.replace(/<a\s/g, '<a class="sc-link" ');
	return <span dangerouslySetInnerHTML={{ __html: styled }} />;
};

const SectionHeading = ({ children }: { children: ReactNode }) => (
	<h2 className="sc-display m-0 mb-5 text-[clamp(28px,3.4vw,40px)] leading-[0.98]">
		{children}
	</h2>
);

const SlotImage = ({
	image,
	className,
}: {
	image: ToolImage;
	className?: string;
}) => (
	<img
		src={image.src}
		alt={image.alt}
		loading="lazy"
		className={`block h-auto w-full rounded-[18px] ${className ?? ""}`}
	/>
);

export const ScreencapToolTemplate = ({
	content,
	toolComponent,
}: {
	content: ToolPageContent;
	toolComponent: ReactNode;
}) => {
	const pathname = usePathname() || "";
	const slug = content.slug ?? pathname.split("/").filter(Boolean).pop() ?? "";
	const where = `tools-${slug}`;
	const related = (
		content.relatedTools ?? ALL_TOOLS.filter((t) => !pathname.endsWith(t.href))
	).filter((t) => t.href !== pathname);
	const meta = [content.byline, content.updated && `Updated ${content.updated}`]
		.filter(Boolean)
		.join(" · ");

	return (
		<main className="sc-tool pb-20 sm:pb-24">
			<div
				className="relative mx-[clamp(20px,5vw,48px)] mt-6 overflow-hidden rounded-[28px] bg-[#BFDDF5] bg-cover bg-[position:center_75%]"
				style={{
					backgroundImage:
						"linear-gradient(180deg, rgba(234,243,252,.3) 0%, rgba(234,243,252,0) 35%, rgba(234,243,252,.35) 100%), url('/sky/peaks-sea.webp')",
				}}
			>
				<div className="mx-auto flex max-w-[1240px] flex-col items-start gap-5 px-5 py-10 sm:px-10 sm:py-14 md:flex-row md:items-center md:justify-between md:py-16">
					<div className="min-w-0 max-w-[760px]">
						<nav
							aria-label="Breadcrumb"
							className="sc-display mb-5 flex items-center gap-2 text-sm font-bold tracking-normal"
						>
							<a
								href="/tools"
								className="sc-sticker !px-3 !py-1 text-sm no-underline"
							>
								Free tools
							</a>
						</nav>
						<h1 className="sc-display m-0 text-[clamp(38px,6vw,72px)] leading-[0.95] break-words">
							{content.title}
						</h1>
						<p className="mt-5 mb-0 inline-block max-w-[62ch] rounded-[14px] bg-white/85 px-[18px] py-2.5 text-[17px] leading-normal text-[#0F2A4A] sm:text-[19px]">
							{content.description}
						</p>
						<div className="mt-5 flex flex-wrap items-center gap-3">
							<span className="sc-sticker inline-flex items-center gap-2 !px-4 !py-2 text-[15px]">
								<svg
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="#1E66B8"
									strokeWidth={2.5}
									strokeLinecap="round"
									strokeLinejoin="round"
									aria-hidden="true"
								>
									<rect x="4" y="10" width="16" height="11" rx="3" />
									<path d="M8 10V7a4 4 0 018 0v3" />
								</svg>
								{content.privacyBadge ?? DEFAULT_PRIVACY}
							</span>
							{meta && (
								<span className="text-sm text-[#0B2440]/80">{meta}</span>
							)}
						</div>
					</div>
					{content.heroImage && (
						<div className="w-full max-w-[420px] shrink-0 md:w-[38%]">
							<SlotImage image={content.heroImage} />
						</div>
					)}
				</div>
			</div>

			<div className="mx-auto max-w-[1000px] px-[clamp(16px,5vw,48px)]">
				<div className="sc-card relative z-10 -mt-6 p-4 sm:-mt-8 sm:p-8">
					{toolComponent}
				</div>

				<section className="mt-14 sm:mt-20">
					<SectionHeading>{content.featuresTitle}</SectionHeading>
					<p className="mt-0 mb-8 max-w-[62ch] text-[17px] leading-relaxed text-[#1B3A5C]">
						{renderHTML(content.featuresDescription)}
					</p>
					<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
						{content.features.map((feature, index) => (
							<div key={feature.title} className="sc-card p-6">
								<span className="sc-display mb-4 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-[#0B2440] bg-[#FFD84D] text-lg">
									{index + 1}
								</span>
								<h3 className="sc-display m-0 mb-2 text-[19px] leading-[1.2] tracking-normal">
									{feature.title}
								</h3>
								<p className="m-0 text-[15px] leading-relaxed text-[#1B3A5C]">
									{renderHTML(feature.description)}
								</p>
							</div>
						))}
					</div>
				</section>

				{content.sections?.map((section) => (
					<section
						key={section.title}
						className="mt-14 grid items-center gap-8 sm:mt-20 md:grid-cols-2"
					>
						<div>
							<SectionHeading>{section.title}</SectionHeading>
							<p className="m-0 text-[17px] leading-relaxed text-[#1B3A5C]">
								{renderHTML(section.body)}
							</p>
						</div>
						{section.image && <SlotImage image={section.image} />}
					</section>
				))}

				{content.faqs && content.faqs.length > 0 && (
					<section className="mt-14 sm:mt-20">
						<SectionHeading>Frequently asked questions</SectionHeading>
						<div className="flex flex-col gap-4">
							{content.faqs.map((faq) => (
								<div key={faq.question} className="sc-card p-5 sm:p-6">
									<h3 className="sc-display m-0 mb-2 text-[19px] leading-[1.25] tracking-normal">
										{faq.question}
									</h3>
									<div className="text-[15px] leading-relaxed text-[#1B3A5C]">
										{renderHTML(faq.answer)}
									</div>
								</div>
							))}
						</div>
					</section>
				)}

				{related.length > 0 && (
					<section className="sc-card mt-14 p-5 sm:mt-20 sm:p-6">
						<h2 className="sc-display m-0 mb-3 text-[24px] leading-[1.05]">
							{content.relatedTitle ?? "More free tools"}
						</h2>
						<ul className="m-0 flex list-none flex-col gap-2 p-0">
							{related.map((tool) => (
								<li key={tool.href}>
									<a href={tool.href} className="sc-link">
										{tool.title}
									</a>
									{tool.description && (
										<span className="text-[#45627F]"> {tool.description}</span>
									)}
								</li>
							))}
						</ul>
					</section>
				)}

				<section className="mt-14 rounded-[28px] bg-[#0B2440] p-6 text-center sm:mt-20 sm:p-12">
					<h2 className="sc-display m-0 mb-3 text-[clamp(28px,4vw,44px)] leading-[0.98] !text-white">
						{content.cta.title}
					</h2>
					<p className="mx-auto mt-0 mb-8 max-w-[56ch] text-[17px] leading-relaxed text-[#DCEBFA]">
						{content.cta.description}
					</p>
					<div className="flex flex-col items-stretch justify-center gap-5 sm:flex-row sm:items-center">
						<a
							href="/signup"
							data-umami-event="signup-click"
							data-umami-event-where={where}
							className="sc-btn sc-btn-accent !border-white !shadow-[0_6px_0_#05121F] text-white no-underline"
						>
							Sign up free
						</a>
						<a
							href="/download"
							data-umami-event="download-click"
							data-umami-event-where={where}
							className="sc-btn sc-btn-light !shadow-[0_6px_0_#05121F] text-[#0B2440] no-underline"
						>
							Download for Mac
						</a>
					</div>
				</section>
			</div>
		</main>
	);
};

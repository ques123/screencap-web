export function ScreencapFooter() {
	return (
		<footer className="border-t border-[#D3E3F3] pt-7 pb-10 text-sm text-[#45627F]">
			<div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-x-6 gap-y-3 px-[clamp(20px,5vw,48px)]">
				<span>
					&copy; 2026 Dharma Loop LLC · Screencap ·{" "}
					<a
						href="mailto:email@screencap.co"
						className="text-[#45627F] no-underline hover:text-[#1E66B8] hover:underline"
					>
						email@screencap.co
					</a>
				</span>
				<nav
					aria-label="Footer"
					className="flex flex-wrap gap-x-[18px] gap-y-1"
				>
					<a
						href="/pricing"
						className="inline-block py-1.5 text-[#45627F] no-underline hover:text-[#1E66B8] hover:underline"
					>
						Pricing
					</a>
					<a
						href="/terms"
						className="inline-block py-1.5 text-[#45627F] no-underline hover:text-[#1E66B8] hover:underline"
					>
						Terms
					</a>
					<a
						href="/privacy"
						className="inline-block py-1.5 text-[#45627F] no-underline hover:text-[#1E66B8] hover:underline"
					>
						Privacy
					</a>
					<a
						href="/acceptable-use"
						className="inline-block py-1.5 text-[#45627F] no-underline hover:text-[#1E66B8] hover:underline"
					>
						Acceptable use
					</a>
					<a
						href="/tools"
						className="inline-block py-1.5 text-[#45627F] no-underline hover:text-[#1E66B8] hover:underline"
					>
						Free tools
					</a>
					<a
						href="/report"
						className="inline-block py-1.5 text-[#45627F] no-underline hover:text-[#1E66B8] hover:underline"
					>
						Report abuse
					</a>
					<a
						href="https://github.com/ques123/screencap-web"
						className="inline-block py-1.5 text-[#45627F] no-underline hover:text-[#1E66B8] hover:underline"
					>
						Source code
					</a>
				</nav>
			</div>
		</footer>
	);
}

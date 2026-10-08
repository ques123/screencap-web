import { Logo } from "@cap/ui/logo";
import Link from "next/link";

type FooterLink = {
	label: string;
	href: string;
	isExternal?: boolean;
};

const footerLinks: { title: string; links: FooterLink[] }[] = [
	{
		title: "Product",
		links: [
			{ label: "Download", href: "/download" },
			{ label: "Self-hosting", href: "/self-hosting" },
			{
				label: "Source code",
				href: "https://github.com/ques123/screencap-web",
				isExternal: true,
			},
		],
	},
	{
		title: "Legal",
		links: [
			{ label: "Terms of Service", href: "/terms" },
			{ label: "Privacy Policy", href: "/privacy" },
			{ label: "Acceptable Use", href: "/acceptable-use" },
			{ label: "Report content", href: "/report" },
		],
	},
];

export const Footer = () => {
	return (
		<footer className="overflow-hidden relative border-t border-gray-4">
			<div className="wrapper relative pt-16 pb-10">
				<div
					aria-hidden="true"
					className="absolute bottom-0 left-1/2 w-[700px] -translate-x-1/2 translate-y-2/3 select-none pointer-events-none opacity-[0.05] sm:w-[1000px] lg:w-[1300px]"
				>
					<Logo hideLogoName className="w-full h-auto" />
				</div>

				<div className="relative z-10">
					<div className="flex flex-col gap-12 md:flex-row md:justify-between">
						<div className="md:w-[260px] md:shrink-0">
							<Logo className="w-[124px] h-auto" />
							<p className="mt-5 max-w-sm text-sm leading-6 text-gray-11">
								Record your screen and share it with a link.
							</p>
						</div>

						<div className="grid grid-cols-2 gap-x-16 gap-y-10">
							{footerLinks.map((column) => (
								<div key={column.title}>
									<h3 className="pb-2 text-lg font-semibold text-gray-12">
										{column.title}
									</h3>
									<ul className="grid grid-cols-1 gap-2">
										{column.links.map((link) => (
											<li key={link.href}>
												<Link
													className="transition-colors text-gray-10 hover:text-gray-12"
													href={link.href}
													target={link.isExternal ? "_blank" : undefined}
													rel={
														link.isExternal ? "noopener noreferrer" : undefined
													}
												>
													{link.label}
												</Link>
											</li>
										))}
									</ul>
								</div>
							))}
						</div>
					</div>

					<div className="pt-8 mt-16 border-t border-gray-4">
						<p className="text-sm text-gray-9">
							© Dharma Loop LLC {new Date().getFullYear()}. Screencap is open
							source under the AGPL-3.0, forked from Cap.
						</p>
					</div>
				</div>
			</div>
		</footer>
	);
};

"use client";

import { Button } from "@cap/ui";
import Link from "next/link";

interface ToolCategory {
	title: string;
	description: string;
	href: string;
	icon: string;
}

const toolCategories: ToolCategory[] = [
	{
		title: "MP4 to GIF",
		description:
			"Turn an MP4 into an animated GIF with control over frame rate, size, and quality",
		href: "/tools/convert/mp4-to-gif",
		icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
	},
	{
		title: "MOV to MP4",
		description:
			"Convert QuickTime MOV files, including iPhone videos, to MP4 that plays everywhere",
		href: "/tools/convert/mov-to-mp4",
		icon: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3",
	},
	{
		title: "GIF to MP4",
		description:
			"Turn a GIF into an MP4 video that plays in QuickTime, Safari and Instagram",
		href: "/tools/convert/gif-to-mp4",
		icon: "M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5",
	},
	{
		title: "Video Speed Controller",
		description: "Speed up or slow down your videos from 0.25x to 3x",
		href: "/tools/video-speed-controller",
		icon: "M15.75 5.25a3 3 0 013 3m-3-3a3 3 0 00-3 3m3-3v1.5m0 9.75a3 3 0 01-3-3m3 3a3 3 0 003-3m-3 3v-1.5m-6-1.5h.008v.008H7.5v-.008zm1.5-9h.375c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-.375m1.5-4.5A1.125 1.125 0 0110.375 7.5h-1.5A1.125 1.125 0 017.75 8.625M10.5 12a.375.375 0 11-.75 0 .375.375 0 01.75 0z",
	},
];

export function PageContent() {
	return (
		<>
			<div className="relative overflow-hidden pt-24 md:pt-[180px]">
				<div className="relative z-10 px-4 w-full h-full flex flex-col justify-center sm:px-5">
					<div className="mx-auto text-center wrapper wrapper-sm">
						<h1 className="fade-in-down text-[1.75rem] leading-[2.25rem] sm:text-[2rem] sm:leading-[2.5rem] md:text-[2.75rem] md:leading-[3.25rem] font-medium relative z-10 text-black mb-4 md:mb-6">
							Try our free tools
						</h1>
						<p className="mx-auto mb-8 max-w-2xl text-sm sm:text-md md:text-xl text-zinc-500 fade-in-down animate-delay-1 md:mb-10">
							Powerful browser-based utilities that run directly on your device.
							No uploads, no installations, maximum privacy.
						</p>
					</div>
					<div className="flex flex-col justify-center items-center space-y-2 fade-in-up animate-delay-2 sm:flex-row sm:space-y-0 sm:space-x-4"></div>
				</div>
			</div>
			<div className="wrapper mx-auto">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8 px-0 sm:px-4 lg:px-12 mt-10 md:mt-16">
					{toolCategories.map((category) => (
						<Link
							key={category.href}
							href={category.href}
							className="group block p-6 sm:p-8 border border-gray-200 bg-gray-1 rounded-xl hover:border-blue-500 hover:shadow-md transition-all"
						>
							<div className="flex flex-col items-center text-center">
								<div className="flex-shrink-0 p-3 bg-blue-100 rounded-xl mb-4 sm:mb-5">
									<svg
										className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										strokeWidth={1.5}
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d={category.icon}
										/>
									</svg>
								</div>
								<h2 className="text-xl sm:text-2xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 sm:mb-3">
									{category.title}
								</h2>
								<p className="text-sm sm:text-base text-gray-600">
									{category.description}
								</p>
							</div>
						</Link>
					))}
				</div>
				<div
					className="mx-auto wrapper mt-10 mb-8 bg-white rounded-2xl sm:rounded-3xl overflow-hidden relative flex flex-col justify-center p-6 sm:p-8 md:p-12 md:mt-16"
					style={{
						minHeight: "250px",
						backgroundImage: "url('/illustrations/ctabg.svg')",
						backgroundSize: "cover",
						backgroundRepeat: "no-repeat",
					}}
				>
					<div className="mx-auto h-full flex flex-col justify-center items-center relative z-10">
						<div className="text-center max-w-[800px] mx-auto mb-6 md:mb-8">
							<h2 className="text-2xl sm:text-3xl md:text-4xl font-medium text-gray-12 mb-3 md:mb-4 drop-shadow-md">
								Record your screen, share a link
							</h2>
							<p className="text-base sm:text-lg md:text-xl mb-5 md:mb-6 text-gray-10">
								Screencap is a free screen recorder for Mac. Record, get a share
								link instantly, and turn on end-to-end encryption so only people
								with the link can watch. No time limits.
							</p>
						</div>
						<div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
							<Button
								variant="blue"
								href="/download"
								size="lg"
								className="w-full sm:w-auto transition-all duration-300 font-medium px-8 py-3"
							>
								Download Screencap free
							</Button>
							<Button
								variant="gray"
								href="/signup"
								size="lg"
								className="w-full sm:w-auto transition-all duration-300 font-medium px-8 py-3"
							>
								Sign up free
							</Button>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}

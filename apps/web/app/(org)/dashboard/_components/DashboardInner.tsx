"use client";
import Top from "./Navbar/Top";

export default function DashboardInner({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex overflow-hidden w-full flex-col flex-1 md:mt-0 mt-[126px]">
			<Top />
			<main
				className={
					"flex relative flex-col flex-1 h-full [grid-area:main] sc-sky overflow-hidden lg:rounded-tl-xl"
				}
			>
				{/* Top cap: renders rounded corner and top/side borders without affecting scroller */}
				<div
					aria-hidden
					className="h-0 rounded-tl-xl border border-b-0 pointer-events-none lg:h-2 border-gray-3"
				/>
				{/* Scrolling content area shares the border; the sky behind comes from .sc-sky on <main> */}
				<div className="flex overflow-hidden overflow-y-auto overscroll-contain flex-col flex-1 p-5 h-full border border-t-0 border-gray-3 lg:p-8 relative">
					<div className="flex flex-col flex-1 gap-4 min-h-fit">{children}</div>
				</div>
			</main>
		</div>
	);
}

import { buildEnv } from "@cap/env";
import "@cap/ui/style";
import type { PropsWithChildren } from "react";
import { formatStarCount, getGitHubStars } from "@/utils/github";
import { DeferredMessengerWidget } from "../Layout/DeferredMessengerWidget";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import { ScreencapFooter } from "./ScreencapFooter";
import { ScreencapHeader } from "./ScreencapHeader";

export default async function Layout(props: PropsWithChildren) {
	if (buildEnv.NEXT_PUBLIC_IS_CAP !== "true") {
		return (
			<div className="min-h-screen bg-[#EAF3FC] text-[#0F2A4A]">
				<ScreencapHeader />
				{props.children}
				<ScreencapFooter />
			</div>
		);
	}

	const starCount = await getGitHubStars();
	const stars = formatStarCount(starCount);

	return (
		<>
			<Navbar stars={stars} />
			{props.children}
			<Footer />
			<DeferredMessengerWidget />
		</>
	);
}

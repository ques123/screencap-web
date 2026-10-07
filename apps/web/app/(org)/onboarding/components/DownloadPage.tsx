"use client";

import { buildEnv } from "@cap/env";
import { useDetectPlatform } from "hooks/useDetectPlatform";
import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { toast } from "sonner";
import { useEffectMutation, useRpcClient } from "@/lib/EffectRuntime";
import { consumeOnboardingNextPath } from "../../onboarding-next";

const recordingModes = [
	{
		badge: "Instant",
		tilt: "-rotate-3",
		image: "/onboarding/mode-instant",
		alt: "A lightning bolt above a laptop with a share link",
		title: "Share the moment you stop",
		description:
			"Your link is ready as soon as you stop recording. Great for quick feedback and bug reports.",
	},
	{
		badge: "Studio",
		tilt: "rotate-2",
		image: "/onboarding/mode-studio",
		alt: "An editing desk with a clapperboard and a timeline",
		title: "Record, then polish",
		description:
			"Record locally, then edit with backgrounds, zooms and trims. Export it or share it.",
	},
];

const macs = [
	{
		key: "silicon",
		name: "Apple Silicon",
		sub: "M1 and later",
		href: "/download/apple-silicon",
	},
	{
		key: "intel",
		name: "Intel",
		sub: "Older Macs",
		href: "/download/apple-intel",
	},
];

const cardClass =
	"bg-white rounded-[26px] border border-[#0b2440]/10 shadow-[0_6px_0_rgba(11,36,64,0.08),0_26px_60px_rgba(11,36,64,0.11)]";

export function DownloadPage() {
	const { platform, isIntel } = useDetectPlatform();
	const router = useRouter();
	const rpc = useRpcClient();
	// Self-hosted builds only ship a Mac app; other platforms record in the browser.
	const browserOnly =
		buildEnv.NEXT_PUBLIC_IS_CAP !== "true" &&
		(platform === "windows" || platform === "linux");
	const recommended =
		platform === "macos" ? (isIntel ? "intel" : "silicon") : null;

	// "inviteTeam" marks both inviteTeam and download as done, so the onboarding
	// layout does not send the user back here.
	const finish = useEffectMutation({
		mutationFn: () =>
			rpc.UserCompleteOnboardingStep({ step: "inviteTeam", data: undefined }),
		onSuccess: () => {
			startTransition(() => {
				router.push(consumeOnboardingNextPath("/dashboard/caps"));
				router.refresh();
			});
		},
		onError: () => {
			toast.error("An error occurred, please try again");
		},
	});

	return (
		<>
			<div
				aria-hidden="true"
				className="sc-sky -z-10 inset-0"
				style={{ position: "fixed" }}
			/>
			<div className="flex flex-col gap-10 items-center py-6 w-full max-w-[1000px] mx-auto">
				<div className="space-y-3 text-center">
					<h1 className="sc-display text-4xl sm:text-5xl lg:text-6xl">
						Download the Mac app
					</h1>
					<p className="text-lg text-[#1b3a5c] text-pretty">
						Pick how you want to record. You can use both.
					</p>
				</div>

				<div className="grid gap-6 w-full sm:grid-cols-2">
					{recordingModes.map((mode) => (
						<div
							key={mode.badge}
							className={`${cardClass} relative flex flex-col gap-4 p-4 pb-6`}
						>
							<div className="overflow-hidden rounded-[18px] bg-[#eaf3fc]">
								<img
									src={`${mode.image}-640.webp`}
									srcSet={`${mode.image}-640.webp 640w, ${mode.image}-1100.webp 1100w`}
									sizes="(min-width: 640px) 480px, 90vw"
									width={640}
									height={480}
									alt={mode.alt}
									loading="lazy"
									className="block w-full h-auto aspect-[4/3] object-cover"
								/>
							</div>
							<span
								className={`sc-display absolute top-6 left-6 px-4 py-2 text-lg rounded-xl border-[3px] border-[#0b2440] bg-[#ffd84d] shadow-[0_4px_0_#0b2440] ${mode.tilt}`}
							>
								{mode.badge}
							</span>
							<div className="px-2 space-y-1">
								<h2 className="sc-display text-2xl">{mode.title}</h2>
								<p className="text-base text-[#1b3a5c] text-pretty">
									{mode.description}
								</p>
							</div>
						</div>
					))}
				</div>

				<div className="flex flex-col gap-5 items-center w-full">
					{browserOnly ? (
						<a href="/dashboard/caps/record" className="sc-btn sc-btn-dark">
							Record in your browser
						</a>
					) : (
						<>
							<div className="flex flex-col gap-5 w-full sm:flex-row sm:justify-center">
								{macs.map((mac) => {
									const isRecommended = recommended === mac.key;
									return (
										<div
											key={mac.key}
											className="flex flex-col gap-2 items-center"
										>
											<a
												href={mac.href}
												className={`sc-btn w-full sm:min-w-[240px] flex-col !gap-1 ${isRecommended ? "sc-btn-dark" : "sc-btn-light"}`}
											>
												<span>{mac.name}</span>
												<span className="text-sm font-semibold opacity-75">
													{mac.sub}
												</span>
											</a>
											<span className="text-sm font-semibold text-[#1e66b8] min-h-5">
												{isRecommended ? "Recommended for your Mac" : ""}
											</span>
										</div>
									);
								})}
							</div>
							<p className="max-w-[460px] text-sm text-center text-[#45627f] text-pretty">
								Which Mac do I have? Open the Apple menu, choose About This Mac.
								If it says Chip, pick Apple Silicon. If it says Processor, pick
								Intel.
							</p>
						</>
					)}
					<button
						type="button"
						className="sc-btn sc-btn-light sc-btn-sm"
						disabled={finish.isPending || finish.isSuccess}
						onClick={() => finish.mutate()}
					>
						{finish.isPending ? "One moment..." : "Continue"}
					</button>
				</div>
			</div>
		</>
	);
}

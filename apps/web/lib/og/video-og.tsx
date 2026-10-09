import { ImageResponse } from "next/og";
import type { ReactNode } from "react";
import { loadOgAssets } from "@/lib/og/assets";
import { loadOgFonts, OG_DISPLAY, OG_MONO } from "@/lib/og/fonts";
import {
	Body,
	Headline,
	OG_HEIGHT,
	OG_INK,
	OG_SUN,
	OG_WIDTH,
	OgCanvas,
	StickerLogo,
} from "@/lib/og/template";
import {
	coverRect,
	loadOgThumbnail,
	type OgThumbnail,
} from "@/lib/og/thumbnail";

export type VideoOgData = {
	title: string;
	ownerName?: string;
	/** Duration in seconds. */
	duration?: number;
	screenshotUrl?: string;
};

export type VideoOgVariant =
	| { kind: "video"; video: VideoOgData }
	| { kind: "locked" }
	| { kind: "password" }
	| { kind: "encrypted" }
	| { kind: "not-found" };

// Thumbnails and titles can change, so cache briefly at the edge and let
// stale-while-revalidate keep crawler/email fetches instant.
const VIDEO_OG_CACHE_CONTROL =
	"public, max-age=600, s-maxage=3600, stale-while-revalidate=86400";

export const formatDuration = (seconds: number) => {
	const total = Math.max(0, Math.round(seconds));
	const mins = Math.floor(total / 60);
	const secs = total % 60;
	if (mins >= 60) {
		const hours = Math.floor(mins / 60);
		return `${hours}:${String(mins % 60).padStart(2, "0")}:${String(
			secs,
		).padStart(2, "0")}`;
	}
	return `${mins}:${String(secs).padStart(2, "0")}`;
};

const PlayButton = ({ size }: { size: number }) => (
	<div
		style={{
			display: "flex",
			width: size,
			height: size,
			borderRadius: 9999,
			background: OG_SUN,
			border: `${Math.round(size * 0.055)}px solid ${OG_INK}`,
			alignItems: "center",
			justifyContent: "center",
			boxShadow: `${Math.round(size * 0.06)}px ${Math.round(size * 0.06)}px 0 ${OG_INK}`,
		}}
	>
		<svg
			role="img"
			aria-label="Play"
			width={Math.round(size * 0.38)}
			height={Math.round(size * 0.38)}
			viewBox="0 0 24 24"
			style={{ marginLeft: Math.round(size * 0.05) }}
		>
			<path
				d="M7 3.8c0-.8.9-1.3 1.6-.9l12 7.6c.6.4.6 1.3 0 1.7l-12 7.6c-.7.4-1.6-.1-1.6-.9Z"
				fill={OG_INK}
			/>
		</svg>
	</div>
);

const IconSvg = ({
	label,
	size,
	children,
}: {
	label: string;
	size: number;
	children: ReactNode;
}) => (
	<svg
		role="img"
		aria-label={label}
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke={OG_INK}
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		{children}
	</svg>
);

type StatusIcon = "lock" | "key" | "search";

const StatusGlyph = ({ icon, size }: { icon: StatusIcon; size: number }) => {
	if (icon === "search")
		return (
			<IconSvg label="Not found" size={size}>
				<circle cx="11" cy="11" r="7" />
				<path d="m20 20-3.5-3.5" />
			</IconSvg>
		);
	if (icon === "key")
		return (
			<IconSvg label="Password" size={size}>
				<circle cx="8" cy="15" r="4" />
				<path d="m11 12 9-9" />
				<path d="m16 7 3 3" />
				<path d="m14 9 2 2" />
			</IconSvg>
		);
	return (
		<IconSvg label="Locked" size={size}>
			<rect width="16" height="11" x="4" y="10.5" rx="2.5" />
			<path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
			<path d="M12 15v2" />
		</IconSvg>
	);
};

const hardShadow = (px: number) => `${px}px ${px}px 0 ${OG_INK}`;

const StickerLabel = ({
	icon,
	children,
}: {
	icon: StatusIcon;
	children: string;
}) => (
	<div
		style={{
			display: "flex",
			alignItems: "center",
			alignSelf: "flex-start",
			gap: 12,
			padding: "10px 24px 10px 18px",
			borderRadius: 20,
			background: OG_SUN,
			border: `4px solid ${OG_INK}`,
			boxShadow: hardShadow(6),
			transform: "rotate(-2deg)",
		}}
	>
		<StatusGlyph icon={icon} size={32} />
		<span
			style={{
				display: "block",
				fontFamily: OG_DISPLAY,
				fontWeight: 800,
				fontSize: 30,
				color: OG_INK,
			}}
		>
			{children}
		</span>
	</div>
);

const THUMB_W = 620;
const THUMB_H = Math.round((THUMB_W * 9) / 16);
const FRAME_BORDER = 6;

const ThumbnailImage = ({ thumbnail }: { thumbnail: OgThumbnail }) => {
	const rect = coverRect(thumbnail, { width: THUMB_W, height: THUMB_H });
	return (
		<div
			style={{
				display: "flex",
				position: "absolute",
				top: rect.top,
				left: rect.left,
				width: rect.width,
				height: rect.height,
				backgroundImage: `url(${thumbnail.src})`,
				backgroundSize: `${rect.width}px ${rect.height}px`,
				backgroundRepeat: "no-repeat",
			}}
		/>
	);
};

const Thumbnail = ({
	thumbnail,
	duration,
}: {
	thumbnail?: OgThumbnail;
	duration?: number;
}) => (
	<div
		style={{
			display: "flex",
			position: "relative",
			width: THUMB_W + FRAME_BORDER * 2,
			height: THUMB_H + FRAME_BORDER * 2,
			borderRadius: 30,
			border: `${FRAME_BORDER}px solid ${OG_INK}`,
			boxShadow: hardShadow(14),
			overflow: "hidden",
			background: thumbnail ? "#0B0F17" : "#FFFFFF",
			alignItems: "center",
			justifyContent: "center",
			transform: "rotate(2deg)",
		}}
	>
		{thumbnail && <ThumbnailImage thumbnail={thumbnail} />}
		{thumbnail && (
			<div
				style={{
					display: "flex",
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: "100%",
					background:
						"linear-gradient(180deg, rgba(11,36,64,0) 0%, rgba(11,36,64,0.12) 60%, rgba(11,36,64,0.4) 100%)",
				}}
			/>
		)}
		<PlayButton size={110} />
		{duration != null && duration > 0 && (
			<div
				style={{
					display: "flex",
					position: "absolute",
					right: 16,
					bottom: 16,
					padding: "6px 14px",
					borderRadius: 999,
					background: "rgba(11,36,64,0.82)",
					fontFamily: OG_MONO,
					fontSize: 20,
					letterSpacing: 0.6,
					color: "white",
				}}
			>
				{formatDuration(duration)}
			</div>
		)}
	</div>
);

const InitialAvatar = ({ name }: { name: string }) => (
	<div
		style={{
			display: "flex",
			width: 48,
			height: 48,
			borderRadius: 9999,
			background: OG_SUN,
			border: `3px solid ${OG_INK}`,
			color: OG_INK,
			fontFamily: OG_DISPLAY,
			fontSize: 22,
			fontWeight: 800,
			alignItems: "center",
			justifyContent: "center",
		}}
	>
		{name.trim().charAt(0).toUpperCase()}
	</div>
);

const videoTitleSize = (title: string) => {
	if (title.length <= 20) return 60;
	if (title.length <= 40) return 50;
	return 42;
};

type Assets = Awaited<ReturnType<typeof loadOgAssets>>;

const videoLayout = (
	video: VideoOgData,
	thumbnail: OgThumbnail | undefined,
	assets: Assets,
) => (
	<OgCanvas background={assets.peaks}>
		<div
			style={{
				display: "flex",
				position: "absolute",
				right: 50,
				top: Math.round((OG_HEIGHT - THUMB_H) / 2) + 8,
			}}
		>
			<Thumbnail thumbnail={thumbnail} duration={video.duration} />
		</div>
		<div
			style={{
				display: "flex",
				position: "absolute",
				top: 0,
				left: 0,
				width: 470,
				height: "100%",
				padding: "48px 0 56px 58px",
				flexDirection: "column",
				justifyContent: "space-between",
			}}
		>
			<div style={{ display: "flex" }}>
				<StickerLogo height={70} />
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
				<Headline size={videoTitleSize(video.title)} lines={4}>
					{video.title}
				</Headline>
				{video.ownerName && (
					<div style={{ display: "flex", alignItems: "center", gap: 14 }}>
						<InitialAvatar name={video.ownerName} />
						<span
							style={{
								display: "block",
								fontSize: 26,
								fontWeight: 600,
								color: OG_INK,
								lineClamp: 1,
							}}
						>
							{video.ownerName}
						</span>
					</div>
				)}
			</div>
			<div style={{ display: "flex", height: 40 }} />
		</div>
	</OgCanvas>
);

type StatusCard = {
	label: string;
	heading: string;
	subline: string;
	icon: StatusIcon;
};

const STATUS_CARDS: Record<
	Exclude<VideoOgVariant["kind"], "video">,
	StatusCard
> = {
	locked: {
		label: "Private",
		heading: "This recording is private",
		subline: "Ask the owner for access, or sign in to watch it on Screencap.",
		icon: "lock",
	},
	password: {
		label: "Password protected",
		heading: "This recording needs a password",
		subline: "Enter the password on Screencap to watch this recording.",
		icon: "key",
	},
	encrypted: {
		label: "End-to-end encrypted",
		heading: "This recording is encrypted",
		subline: "Open the full link to watch this recording.",
		icon: "lock",
	},
	"not-found": {
		label: "Not found",
		heading: "This recording doesn't exist",
		subline: "The recording you're looking for has moved or was deleted.",
		icon: "search",
	},
};

const statusLayout = (card: StatusCard, assets: Assets) => (
	<OgCanvas background={assets.peaks}>
		<div
			style={{
				display: "flex",
				position: "absolute",
				right: 96,
				top: 118,
				width: 270,
				height: 270,
				borderRadius: 64,
				background: "#FFFFFF",
				border: `7px solid ${OG_INK}`,
				boxShadow: hardShadow(14),
				alignItems: "center",
				justifyContent: "center",
				transform: "rotate(4deg)",
			}}
		>
			<StatusGlyph icon={card.icon} size={150} />
		</div>
		<div
			style={{
				display: "flex",
				position: "absolute",
				top: 0,
				left: 0,
				width: 700,
				height: "100%",
				padding: "48px 0 56px 58px",
				flexDirection: "column",
				justifyContent: "space-between",
			}}
		>
			<div style={{ display: "flex" }}>
				<StickerLogo height={70} />
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
				<StickerLabel icon={card.icon}>{card.label}</StickerLabel>
				<Headline size={70} lines={3}>
					{card.heading}
				</Headline>
				<Body size={29} lines={2}>
					{card.subline}
				</Body>
			</div>
			<div style={{ display: "flex", height: 56 }} />
		</div>
	</OgCanvas>
);

export async function renderVideoOg(variant: VideoOgVariant) {
	const screenshotUrl =
		variant.kind === "video" ? variant.video.screenshotUrl : undefined;
	const [fonts, assets, thumbnail] = await Promise.all([
		loadOgFonts(),
		loadOgAssets(),
		screenshotUrl ? loadOgThumbnail(screenshotUrl) : undefined,
	]);
	const element =
		variant.kind === "video"
			? videoLayout(variant.video, thumbnail, assets)
			: statusLayout(STATUS_CARDS[variant.kind], assets);

	return new ImageResponse(element, {
		width: OG_WIDTH,
		height: OG_HEIGHT,
		fonts,
		headers: {
			"Cache-Control": VIDEO_OG_CACHE_CONTROL,
			"X-Robots-Tag": "noindex",
		},
	});
}

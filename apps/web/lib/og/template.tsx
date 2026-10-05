import type { CSSProperties, ReactNode } from "react";
import { OG_MONO, OG_SANS, OG_SERIF } from "@/lib/og/fonts";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

export const OG_BLUE = "#4785FF";
export const OG_BLUE_LIGHT = "#ADC9FF";
export const OG_INK = "#111111";
export const OG_INK_SOFT = "rgba(17,17,17,0.74)";
export const OG_INK_MUTED = "rgba(17,17,17,0.5)";

// Light-mode UI palette approximating the desktop app's gray scale.
const UI = {
	windowBg: "#FCFCFC",
	rowBg: "#F9FAFB",
	border: "#E2E4E8",
	text: "#1F2329",
	textDim: "#64686F",
	icon: "#8A8F98",
	blueBorder: "#7DA8F5",
	blueBg: "#EDF4FF",
	blueText: "#2F62D4",
	blueIcon: "#3672E8",
	pillBg: "#F1F2F4",
	pillBorder: "#E2E4E8",
};

const flex = (extra: CSSProperties = {}): CSSProperties => ({
	display: "flex",
	...extra,
});

export const OgCanvas = ({
	background,
	children,
}: {
	background: string;
	children: ReactNode;
}) => (
	<div
		style={flex({
			width: "100%",
			height: "100%",
			position: "relative",
			fontFamily: OG_SANS,
			color: OG_INK,
			background: "#EDF1F6",
		})}
	>
		<div
			style={flex({
				position: "absolute",
				top: 0,
				left: 0,
				width: OG_WIDTH,
				height: OG_HEIGHT,
				backgroundImage: `url(${background})`,
				backgroundSize: `${OG_WIDTH}px ${OG_HEIGHT}px`,
			})}
		/>
		{children}
	</div>
);

export const Headline = ({
	children,
	size,
	lines = 3,
}: {
	children: string;
	size: number;
	lines?: number;
}) => (
	<span
		style={{
			display: "block",
			fontSize: size,
			fontWeight: 400,
			lineHeight: 1.02,
			letterSpacing: -size * 0.03,
			color: OG_INK,
			lineClamp: lines,
		}}
	>
		{children}
	</span>
);

export const Body = ({
	children,
	size = 27,
	lines = 2,
}: {
	children: string;
	size?: number;
	lines?: number;
}) => (
	<span
		style={{
			display: "block",
			fontFamily: OG_SERIF,
			fontSize: size,
			fontWeight: 300,
			lineHeight: 1.38,
			letterSpacing: -size * 0.01,
			color: OG_INK_SOFT,
			lineClamp: lines,
		}}
	>
		{children}
	</span>
);

export const MeshFrame = ({
	mesh,
	width,
	height,
	padding = 12,
	radius = 28,
	children,
}: {
	mesh: string;
	width: number;
	height: number;
	padding?: number;
	radius?: number;
	children: ReactNode;
}) => (
	<div
		style={flex({
			position: "relative",
			width,
			height,
			padding,
			borderRadius: radius,
			overflow: "hidden",
			boxShadow:
				"0 40px 80px -24px rgba(40,72,130,0.35), 0 0 0 1px rgba(255,255,255,0.55)",
		})}
	>
		<div
			style={flex({
				position: "absolute",
				top: 0,
				left: 0,
				width,
				height,
				backgroundImage: `url(${mesh})`,
				backgroundSize: `${width}px ${height}px`,
			})}
		/>
		{children}
	</div>
);

// Screencap mark (viewBox 0 0 40 40): four viewfinder brackets + the record dot, the same
// geometry as packages/ui screencap-brand.ts. Returned as an array: satori drops React
// fragments nested inside <svg>.
const SC_INK = "#14161A";
const SC_RED = "#FF4A2E";
const logoMark = () => [
	...["M13.6 4H4V13.6", "M26.4 4H36V13.6", "M13.6 36H4V26.4", "M26.4 36H36V26.4"].map(
		(d) => (
			<path
				key={d}
				d={d}
				fill="none"
				stroke={SC_INK}
				strokeWidth={4.5}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		),
	),
	<circle key="dot" cx="20" cy="20" r="7" fill={SC_RED} />,
];

// The "screencap" wordmark (Manrope ExtraBold as a path), x 48..177 in a 180x40 box.
const WORDMARK_PATH =
	"M54.31 27.39Q51.65 27.39 50.02 26.19Q48.39 24.98 48.04 22.79L51.65 22.24Q51.88 23.23 52.64 23.79Q53.4 24.35 54.57 24.35Q55.53 24.35 56.05 23.98Q56.57 23.61 56.57 22.94Q56.57 22.53 56.36 22.27Q56.15 22.02 55.43 21.77Q54.71 21.53 53.19 21.12Q51.47 20.68 50.45 20.14Q49.42 19.59 48.96 18.83Q48.51 18.07 48.51 16.99Q48.51 15.64 49.2 14.64Q49.89 13.65 51.14 13.11Q52.39 12.57 54.1 12.57Q55.75 12.57 57.02 13.08Q58.3 13.58 59.08 14.52Q59.87 15.46 60.05 16.73L56.44 17.38Q56.35 16.6 55.76 16.15Q55.18 15.69 54.18 15.61Q53.2 15.55 52.61 15.87Q52.02 16.2 52.02 16.81Q52.02 17.17 52.27 17.42Q52.52 17.67 53.32 17.93Q54.12 18.19 55.76 18.6Q57.36 19.02 58.33 19.57Q59.3 20.12 59.74 20.9Q60.18 21.67 60.18 22.76Q60.18 24.92 58.62 26.16Q57.06 27.39 54.31 27.39ZM68.71 27.39Q66.53 27.39 64.97 26.41Q63.41 25.44 62.57 23.76Q61.74 22.09 61.74 19.98Q61.74 17.85 62.61 16.17Q63.47 14.49 65.04 13.53Q66.62 12.57 68.76 12.57Q71.25 12.57 72.93 13.82Q74.61 15.08 75.08 17.25L71.54 18.19Q71.23 17.09 70.46 16.48Q69.69 15.87 68.71 15.87Q67.59 15.87 66.88 16.41Q66.16 16.95 65.82 17.88Q65.49 18.81 65.49 19.98Q65.49 21.81 66.3 22.95Q67.11 24.09 68.71 24.09Q69.91 24.09 70.53 23.54Q71.15 23 71.47 21.98L75.08 22.74Q74.48 24.97 72.82 26.18Q71.15 27.39 68.71 27.39ZM77.16 27V12.96H80.28V16.39L79.94 15.95Q80.22 15.22 80.67 14.62Q81.12 14.03 81.79 13.64Q82.3 13.32 82.89 13.15Q83.49 12.97 84.13 12.93Q84.77 12.88 85.4 12.96V16.26Q84.82 16.08 84.04 16.14Q83.27 16.2 82.65 16.5Q82.02 16.78 81.59 17.26Q81.16 17.73 80.94 18.37Q80.72 19.02 80.72 19.82V27ZM93.88 27.39Q91.72 27.39 90.08 26.46Q88.43 25.53 87.5 23.9Q86.57 22.27 86.57 20.16Q86.57 17.86 87.48 16.16Q88.39 14.46 89.99 13.51Q91.59 12.57 93.67 12.57Q95.88 12.57 97.43 13.61Q98.97 14.65 99.72 16.54Q100.46 18.42 100.24 20.97H96.74V19.67Q96.74 17.52 96.06 16.58Q95.37 15.64 93.83 15.64Q92.02 15.64 91.17 16.74Q90.32 17.84 90.32 19.98Q90.32 21.94 91.17 23.02Q92.02 24.09 93.67 24.09Q94.71 24.09 95.45 23.63Q96.19 23.18 96.58 22.32L100.12 23.33Q99.33 25.26 97.62 26.32Q95.91 27.39 93.88 27.39ZM89.22 20.97V18.34H98.53V20.97ZM109.17 27.39Q107.01 27.39 105.36 26.46Q103.72 25.53 102.79 23.9Q101.86 22.27 101.86 20.16Q101.86 17.86 102.77 16.16Q103.68 14.46 105.28 13.51Q106.88 12.57 108.96 12.57Q111.17 12.57 112.72 13.61Q114.26 14.65 115 16.54Q115.74 18.42 115.52 20.97H112.03V19.67Q112.03 17.52 111.34 16.58Q110.66 15.64 109.11 15.64Q107.31 15.64 106.46 16.74Q105.6 17.84 105.6 19.98Q105.6 21.94 106.46 23.02Q107.31 24.09 108.96 24.09Q110 24.09 110.74 23.63Q111.48 23.18 111.87 22.32L115.41 23.33Q114.61 25.26 112.9 26.32Q111.19 27.39 109.17 27.39ZM104.51 20.97V18.34H113.82V20.97ZM127.5 27V20.37Q127.5 19.89 127.44 19.14Q127.39 18.39 127.12 17.64Q126.85 16.89 126.23 16.38Q125.61 15.87 124.48 15.87Q124.03 15.87 123.5 16.02Q122.98 16.16 122.53 16.57Q122.08 16.98 121.78 17.77Q121.49 18.56 121.49 19.88L119.46 18.91Q119.46 17.25 120.14 15.79Q120.81 14.34 122.17 13.44Q123.53 12.54 125.6 12.54Q127.25 12.54 128.29 13.1Q129.33 13.66 129.91 14.52Q130.49 15.38 130.73 16.31Q130.98 17.24 131.03 18Q131.08 18.77 131.08 19.12V27ZM117.9 27V12.96H121.05V17.61H121.49V27ZM140.13 27.39Q137.95 27.39 136.39 26.41Q134.83 25.44 134 23.76Q133.16 22.09 133.16 19.98Q133.16 17.85 134.03 16.17Q134.89 14.49 136.47 13.53Q138.04 12.57 140.18 12.57Q142.67 12.57 144.35 13.82Q146.03 15.08 146.5 17.25L142.97 18.19Q142.65 17.09 141.88 16.48Q141.11 15.87 140.13 15.87Q139.01 15.87 138.3 16.41Q137.58 16.95 137.25 17.88Q136.91 18.81 136.91 19.98Q136.91 21.81 137.72 22.95Q138.53 24.09 140.13 24.09Q141.33 24.09 141.95 23.54Q142.58 23 142.89 21.98L146.5 22.74Q145.9 24.97 144.24 26.18Q142.58 27.39 140.13 27.39ZM152.48 27.39Q150.97 27.39 149.93 26.81Q148.88 26.23 148.34 25.26Q147.8 24.3 147.8 23.13Q147.8 22.15 148.1 21.34Q148.4 20.54 149.07 19.92Q149.74 19.3 150.87 18.89Q151.65 18.6 152.73 18.38Q153.81 18.16 155.17 17.96Q156.54 17.76 158.18 17.51L156.9 18.21Q156.9 16.96 156.3 16.38Q155.71 15.79 154.3 15.79Q153.52 15.79 152.68 16.17Q151.83 16.55 151.49 17.51L148.3 16.5Q148.83 14.75 150.3 13.66Q151.77 12.57 154.3 12.57Q156.16 12.57 157.6 13.14Q159.05 13.71 159.79 15.12Q160.2 15.9 160.28 16.68Q160.36 17.46 160.36 18.42V27H157.27V24.11L157.71 24.71Q156.68 26.13 155.49 26.76Q154.3 27.39 152.48 27.39ZM153.24 24.61Q154.21 24.61 154.88 24.26Q155.55 23.92 155.95 23.48Q156.34 23.04 156.49 22.74Q156.76 22.16 156.8 21.4Q156.85 20.64 156.85 20.14L157.89 20.4Q156.32 20.66 155.34 20.83Q154.37 21.01 153.77 21.15Q153.17 21.29 152.72 21.46Q152.2 21.67 151.88 21.91Q151.56 22.15 151.41 22.44Q151.26 22.72 151.26 23.07Q151.26 23.55 151.5 23.9Q151.74 24.24 152.18 24.43Q152.62 24.61 153.24 24.61ZM170.11 27.39Q168.02 27.39 166.61 26.41Q165.21 25.44 164.5 23.76Q163.79 22.09 163.79 19.98Q163.79 17.87 164.49 16.2Q165.2 14.52 166.56 13.55Q167.93 12.57 169.93 12.57Q171.94 12.57 173.44 13.53Q174.93 14.49 175.76 16.16Q176.58 17.84 176.58 19.98Q176.58 22.09 175.77 23.76Q174.96 25.44 173.5 26.41Q172.05 27.39 170.11 27.39ZM163.19 33.24V12.96H166.31V22.58H166.76V33.24ZM169.54 24.24Q170.68 24.24 171.41 23.67Q172.14 23.1 172.49 22.13Q172.84 21.16 172.84 19.98Q172.84 18.81 172.48 17.84Q172.11 16.87 171.35 16.29Q170.59 15.72 169.41 15.72Q168.3 15.72 167.62 16.25Q166.94 16.78 166.63 17.74Q166.31 18.71 166.31 19.98Q166.31 21.25 166.63 22.22Q166.94 23.18 167.65 23.71Q168.36 24.24 169.54 24.24Z";

export const CapAppIcon = ({ size }: { size: number }) => (
	<div
		style={flex({
			width: size,
			height: size,
			borderRadius: Math.round(size * 0.2),
			boxShadow: "0 4px 14px rgba(23,58,128,0.18)",
		})}
	>
		<svg
			role="img"
			aria-label="Screencap"
			width={size}
			height={size}
			viewBox="0 0 40 40"
		>
			<rect width="40" height="40" rx="8" fill="white" />
			<g transform="translate(6 6) scale(0.7)">{logoMark()}</g>
		</svg>
	</div>
);

export const CapWordmark = ({
	height = 52,
	color = OG_INK,
}: {
	height?: number;
	color?: string;
}) => (
	<div style={flex({ alignItems: "center", gap: Math.round(height * 0.28) })}>
		<CapAppIcon size={height} />
		<svg
			role="img"
			aria-label="Screencap"
			width={Math.round((height * 134) / 40)}
			height={height}
			viewBox="46 0 134 40"
		>
			<path fill={color} d={WORDMARK_PATH} />
		</svg>
	</div>
);

/** The in-app logo — bare mark + wordmark, as the main window renders it. */
const CapFullLogo = ({ height, color }: { height: number; color: string }) => (
	<svg
		role="img"
		aria-label="Screencap"
		width={Math.round((height * 180) / 40)}
		height={height}
		viewBox="0 0 180 40"
	>
		{logoMark()}
		<path fill={color} d={WORDMARK_PATH} />
	</svg>
);

const Stroke = {
	fill: "none",
	strokeWidth: 2,
	strokeLinecap: "round" as const,
	strokeLinejoin: "round" as const,
};

const MonitorIcon = ({ size, color }: { size: number; color: string }) => (
	<svg
		role="img"
		aria-label="Display"
		width={size}
		height={size}
		viewBox="0 0 24 24"
	>
		<rect
			x="2"
			y="3"
			width="20"
			height="14"
			rx="2"
			{...Stroke}
			stroke={color}
		/>
		<path d="M8 21h8M12 17v4" {...Stroke} stroke={color} />
	</svg>
);

const AppWindowIcon = ({ size, color }: { size: number; color: string }) => (
	<svg
		role="img"
		aria-label="Window"
		width={size}
		height={size}
		viewBox="0 0 24 24"
	>
		<rect
			x="2"
			y="4"
			width="20"
			height="16"
			rx="2"
			{...Stroke}
			stroke={color}
		/>
		<path d="M2 9h20" {...Stroke} stroke={color} />
		<path d="M5 6.5h.01M8 6.5h.01" {...Stroke} stroke={color} />
	</svg>
);

const AreaIcon = ({ size, color }: { size: number; color: string }) => (
	<svg
		role="img"
		aria-label="Area"
		width={size}
		height={size}
		viewBox="0 0 24 24"
	>
		<path d="M3 8V5a2 2 0 0 1 2-2h3" {...Stroke} stroke={color} />
		<path d="M16 3h3a2 2 0 0 1 2 2v3" {...Stroke} stroke={color} />
		<path d="M21 16v3a2 2 0 0 1-2 2h-3" {...Stroke} stroke={color} />
		<path d="M8 21H5a2 2 0 0 1-2-2v-3" {...Stroke} stroke={color} />
		<rect x="8" y="8" width="8" height="8" rx="1" {...Stroke} stroke={color} />
	</svg>
);

const VideoIcon = ({ size, color }: { size: number; color: string }) => (
	<svg
		role="img"
		aria-label="Camera"
		width={size}
		height={size}
		viewBox="0 0 24 24"
	>
		<path
			d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"
			{...Stroke}
			stroke={color}
		/>
		<rect
			x="2"
			y="6"
			width="14"
			height="12"
			rx="2"
			{...Stroke}
			stroke={color}
		/>
	</svg>
);

const MicIcon = ({ size, color }: { size: number; color: string }) => (
	<svg
		role="img"
		aria-label="Microphone"
		width={size}
		height={size}
		viewBox="0 0 24 24"
	>
		<path
			d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
			{...Stroke}
			stroke={color}
		/>
		<path d="M19 10v2a7 7 0 0 1-14 0v-2" {...Stroke} stroke={color} />
		<path d="M12 19v3" {...Stroke} stroke={color} />
	</svg>
);

const ChevronDown = ({ size, color }: { size: number; color: string }) => (
	<svg
		role="img"
		aria-label="Open"
		width={size}
		height={size}
		viewBox="0 0 24 24"
	>
		<path d="m6 9 6 6 6-6" {...Stroke} stroke={color} />
	</svg>
);

const GearIcon = ({ size, color }: { size: number; color: string }) => (
	<svg
		role="img"
		aria-label="Settings"
		width={size}
		height={size}
		viewBox="0 0 24 24"
	>
		<circle cx="12" cy="12" r="3" {...Stroke} stroke={color} />
		<path
			d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
			{...Stroke}
			stroke={color}
		/>
	</svg>
);

const ImageIcon = ({ size, color }: { size: number; color: string }) => (
	<svg
		role="img"
		aria-label="Screenshots"
		width={size}
		height={size}
		viewBox="0 0 24 24"
	>
		<rect
			x="3"
			y="3"
			width="18"
			height="18"
			rx="2"
			{...Stroke}
			stroke={color}
		/>
		<circle cx="9" cy="9" r="2" {...Stroke} stroke={color} />
		<path
			d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"
			{...Stroke}
			stroke={color}
		/>
	</svg>
);

const SquarePlayIcon = ({ size, color }: { size: number; color: string }) => (
	<svg
		role="img"
		aria-label="Recordings"
		width={size}
		height={size}
		viewBox="0 0 24 24"
	>
		<rect
			x="3"
			y="3"
			width="18"
			height="18"
			rx="2"
			{...Stroke}
			stroke={color}
		/>
		<path d="m10 8 5 4-5 4Z" {...Stroke} stroke={color} />
	</svg>
);

const Maximize2Icon = ({ size, color }: { size: number; color: string }) => (
	<svg
		role="img"
		aria-label="Expand"
		width={size}
		height={size}
		viewBox="0 0 24 24"
	>
		<path
			d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
			{...Stroke}
			stroke={color}
		/>
	</svg>
);

/** Lightning bolt from the app's Instant-mode icon. */
const InstantBolt = ({ height, color }: { height: number; color: string }) => (
	<svg
		role="img"
		aria-label="Instant mode"
		width={Math.round((height * 152) / 223)}
		height={height}
		viewBox="0 0 152 223"
	>
		<path
			fill={color}
			d="M150.167 109.163L53.4283 220.65C52.4032 221.826 51.05 222.613 49.573 222.89C48.0959 223.167 46.5752 222.919 45.2403 222.185C43.9054 221.451 42.8287 220.27 42.1727 218.82C41.5167 217.369 41.317 215.729 41.6038 214.146L54.2661 146.019L4.48901 125.914C3.41998 125.484 2.46665 124.776 1.7142 123.853C0.961745 122.93 0.433602 121.82 0.176954 120.624C-0.0796948 119.428 -0.0568536 118.182 0.243435 116.997C0.543723 115.813 1.1121 114.727 1.8978 113.837L98.6363 2.35043C99.6614 1.17365 101.015 0.387451 102.492 0.110461C103.969 -0.166529 105.489 0.080724 106.824 0.814909C108.159 1.54909 109.236 2.73037 109.892 4.18049C110.548 5.63061 110.748 7.27088 110.461 8.85379L97.7639 77.0554L147.541 97.1322C148.602 97.5652 149.548 98.2727 150.294 99.1922C151.041 100.112 151.566 101.215 151.822 102.404C152.078 103.593 152.058 104.832 151.763 106.011C151.468 107.19 150.908 108.273 150.132 109.163H150.167Z"
		/>
	</svg>
);

const FilmIcon = ({ size, color }: { size: number; color: string }) => (
	<svg
		role="img"
		aria-label="Studio mode"
		width={size}
		height={size}
		viewBox="0 0 24 24"
	>
		<rect
			x="3"
			y="3"
			width="18"
			height="18"
			rx="2"
			{...Stroke}
			stroke={color}
		/>
		<path
			d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4"
			{...Stroke}
			stroke={color}
		/>
	</svg>
);

const ScreenshotModeIcon = ({
	size,
	color,
}: {
	size: number;
	color: string;
}) => (
	<svg
		role="img"
		aria-label="Screenshot mode"
		width={size}
		height={size}
		viewBox="0 0 24 24"
	>
		<path
			fill={color}
			d="M21 2H3a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1ZM20 14l-3-3-5 5-2-2-6 6V4h16ZM6 8.5A2.5 2.5 0 1 1 8.5 11 2.5 2.5 0 0 1 6 8.5Z"
		/>
	</svg>
);

const TrafficLights = () => (
	<div style={flex({ gap: 9, alignItems: "center" })}>
		<div
			style={flex({
				width: 13,
				height: 13,
				borderRadius: 9999,
				background: "#FF5F57",
			})}
		/>
		<div
			style={flex({
				width: 13,
				height: 13,
				borderRadius: 9999,
				background: "#FEBC2E",
			})}
		/>
		<div
			style={flex({
				width: 13,
				height: 13,
				borderRadius: 9999,
				background: "#28C840",
			})}
		/>
	</div>
);

const ModeSwitcher = () => (
	<div
		style={flex({
			position: "relative",
			alignItems: "center",
			gap: 9,
			padding: 7,
			borderRadius: 999,
			border: `1px solid ${UI.pillBorder}`,
			background: UI.pillBg,
		})}
	>
		<div
			style={flex({
				position: "absolute",
				left: -6,
				top: -8,
				width: 15,
				height: 15,
				borderRadius: 9999,
				background: "#E0E2E5",
				alignItems: "center",
				justifyContent: "center",
				fontSize: 9,
				fontWeight: 700,
				color: UI.textDim,
			})}
		>
			i
		</div>
		{/* Instant — selected: disc with blue ring */}
		<div
			style={flex({
				width: 34,
				height: 34,
				borderRadius: 9999,
				border: `2px solid ${OG_BLUE}`,
				background: "#CDCFD3",
				alignItems: "center",
				justifyContent: "center",
			})}
		>
			<InstantBolt height={16} color="#1F2329" />
		</div>
		<div
			style={flex({
				width: 34,
				height: 34,
				borderRadius: 9999,
				alignItems: "center",
				justifyContent: "center",
			})}
		>
			<FilmIcon size={16} color="#1F2329" />
		</div>
		<div
			style={flex({
				width: 34,
				height: 34,
				borderRadius: 9999,
				alignItems: "center",
				justifyContent: "center",
			})}
		>
			<ScreenshotModeIcon size={15} color="#1F2329" />
		</div>
	</div>
);

const TargetSplitButton = ({
	icon,
	label,
	selected,
}: {
	icon: ReactNode;
	label: string;
	selected?: boolean;
}) => (
	<div
		style={flex({
			flexGrow: 1,
			flexBasis: 0,
			borderRadius: 10,
			border: `1px solid ${selected ? UI.blueBorder : UI.border}`,
			background: selected ? UI.blueBg : UI.rowBg,
			overflow: "hidden",
		})}
	>
		<div
			style={flex({
				flexGrow: 1,
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				gap: 5,
				padding: "10px 0 9px",
			})}
		>
			{icon}
			<span
				style={{
					fontSize: 14,
					fontWeight: 500,
					color: selected ? UI.blueText : UI.text,
				}}
			>
				{label}
			</span>
		</div>
		<div
			style={flex({
				width: 30,
				alignItems: "center",
				justifyContent: "center",
				borderLeft: `1px solid ${selected ? "#B9D0F8" : UI.border}`,
			})}
		>
			<ChevronDown size={15} color={selected ? UI.blueIcon : UI.icon} />
		</div>
	</div>
);

const TargetButton = ({ icon, label }: { icon: ReactNode; label: string }) => (
	<div
		style={flex({
			flexGrow: 1,
			flexBasis: 0,
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "center",
			gap: 5,
			padding: "10px 0 9px",
			borderRadius: 10,
			border: `1px solid ${UI.border}`,
			background: UI.rowBg,
		})}
	>
		{icon}
		<span style={{ fontSize: 14, fontWeight: 500, color: UI.text }}>
			{label}
		</span>
	</div>
);

const DeviceRow = ({
	icon,
	label,
	trailing,
}: {
	icon: ReactNode;
	label: string;
	trailing: ReactNode;
}) => (
	<div
		style={flex({
			alignItems: "center",
			gap: 12,
			height: 50,
			paddingLeft: 14,
			paddingRight: 10,
			borderRadius: 10,
			border: `1px solid ${UI.border}`,
			background: UI.rowBg,
		})}
	>
		{icon}
		<span
			style={{
				flexGrow: 1,
				fontSize: 16,
				fontWeight: 500,
				color: UI.text,
			}}
		>
			{label}
		</span>
		{trailing}
	</div>
);

/** Miniature of the actual Cap main window (new-main, light mode). */
export const RecorderCard = ({ width = 380 }: { width?: number }) => (
	<div
		style={flex({
			width,
			flexDirection: "column",
			background: UI.windowBg,
			borderRadius: 16,
			padding: "14px 16px 16px",
			gap: 11,
			boxShadow: "0 30px 60px rgba(20,52,120,0.22)",
		})}
	>
		{/* window chrome */}
		<div style={flex({ alignItems: "center" })}>
			<TrafficLights />
			<div style={flex({ flexGrow: 1 })} />
			<div style={flex({ gap: 11, alignItems: "center" })}>
				<Maximize2Icon size={15} color={UI.icon} />
				<GearIcon size={17} color={UI.icon} />
				<ImageIcon size={17} color={UI.icon} />
				<SquarePlayIcon size={17} color={UI.icon} />
			</div>
		</div>
		{/* logo row + mode switcher */}
		<div style={flex({ alignItems: "center", marginTop: 4 })}>
			<CapFullLogo height={30} color="#12161F" />
			<div
				style={flex({
					marginLeft: 8,
					padding: "3px 8px",
					borderRadius: 8,
					border: `1px solid ${UI.pillBorder}`,
					background: UI.pillBg,
					fontSize: 11,
					fontWeight: 500,
					color: UI.textDim,
				})}
			>
				Personal
			</div>
			<div style={flex({ flexGrow: 1 })} />
			<ModeSwitcher />
		</div>
		{/* capture targets */}
		<div style={flex({ gap: 9, marginTop: 2 })}>
			<TargetSplitButton
				selected
				icon={<MonitorIcon size={22} color={UI.blueIcon} />}
				label="Display"
			/>
			<TargetSplitButton
				icon={<AppWindowIcon size={22} color={UI.icon} />}
				label="Window"
			/>
		</div>
		<div style={flex({ gap: 9 })}>
			<TargetButton
				icon={<AreaIcon size={22} color={UI.icon} />}
				label="Area"
			/>
			<TargetButton
				icon={<VideoIcon size={22} color={UI.icon} />}
				label="Camera Only"
			/>
		</div>
		{/* devices */}
		<DeviceRow
			icon={<VideoIcon size={19} color={UI.textDim} />}
			label="MacBook Pro Camera"
			trailing={<ChevronDown size={16} color={UI.icon} />}
		/>
		<DeviceRow
			icon={<MicIcon size={19} color={UI.textDim} />}
			label="MacBook Pro Microphone"
			trailing={<ChevronDown size={16} color={UI.icon} />}
		/>
		<DeviceRow
			icon={<MonitorIcon size={19} color={UI.textDim} />}
			label="Record System Audio"
			trailing={
				<div
					style={flex({
						alignItems: "center",
						justifyContent: "center",
						minWidth: 44,
						height: 26,
						padding: "0 12px",
						borderRadius: 999,
						background: OG_BLUE,
						fontSize: 12,
						fontWeight: 500,
						color: "white",
					})}
				>
					On
				</div>
			}
		/>
	</div>
);

const AppleGlyph = ({ size }: { size: number }) => (
	<svg
		role="img"
		aria-label="Apple"
		width={size}
		height={size}
		viewBox="0 0 24 24"
	>
		<path
			fill="#111111"
			d="M16.37 12.7c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.77-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.78.74 2.99.72 1.24-.02 2.02-1.12 2.77-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.39-.92-2.4-3.65ZM14.1 5.94c.63-.77 1.06-1.83.94-2.9-.91.04-2.02.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.27Z"
		/>
	</svg>
);

const MenuBar = () => (
	<div
		style={flex({
			alignItems: "center",
			height: 30,
			padding: "0 16px",
			gap: 18,
			background: "rgba(255,255,255,0.55)",
			fontSize: 13,
			fontWeight: 500,
			color: "#111111",
		})}
	>
		<AppleGlyph size={15} />
		<span style={{ fontWeight: 600 }}>Screencap</span>
		<span style={{ fontWeight: 400 }}>File</span>
		<span style={{ fontWeight: 400 }}>Edit</span>
		<span style={{ fontWeight: 400 }}>View</span>
		<span style={{ fontWeight: 400 }}>Window</span>
	</div>
);

export const DesktopArt = ({
	mesh,
	wallpaper,
}: {
	mesh: string;
	wallpaper: string;
}) => (
	<MeshFrame mesh={mesh} width={640} height={580}>
		<div
			style={flex({
				position: "relative",
				flexDirection: "column",
				width: 616,
				height: 556,
				borderRadius: 18,
				overflow: "hidden",
				background: "#9FC0E6",
			})}
		>
			<div
				style={flex({
					position: "absolute",
					top: -10,
					left: -150,
					width: 1024,
					height: 576,
					backgroundImage: `url(${wallpaper})`,
					backgroundSize: "1024px 576px",
				})}
			/>
			<MenuBar />
			<div
				style={flex({
					position: "absolute",
					left: 132,
					top: 64,
				})}
			>
				<RecorderCard width={380} />
			</div>
		</div>
	</MeshFrame>
);

const Segment = ({
	label,
	active,
	badge,
}: {
	label: string;
	active?: boolean;
	badge?: string;
}) => (
	<div
		style={flex({
			flexGrow: 1,
			flexBasis: 0,
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			height: 42,
			borderRadius: 10,
			background: active ? "#DCEBFC" : "transparent",
			fontSize: 16,
			fontWeight: 500,
			color: active ? OG_INK : "rgba(17,17,17,0.55)",
		})}
	>
		{label}
		{badge && (
			<span
				style={{
					fontFamily: OG_MONO,
					fontSize: 11,
					letterSpacing: 0.8,
					padding: "3px 7px",
					borderRadius: 6,
					background: "#E1EFFE",
					color: "#3D77C2",
				}}
			>
				{badge}
			</span>
		)}
	</div>
);

const PlanCardArt = ({
	name,
	chip,
	chipBg,
	chipColor,
	blurb,
	price,
	unit,
	note,
	children,
	width,
}: {
	name: string;
	chip: string;
	chipBg: string;
	chipColor: string;
	blurb: string;
	price: string;
	unit: string;
	note: string;
	children?: ReactNode;
	width: number;
}) => (
	<div
		style={flex({
			flexDirection: "column",
			width,
			height: "100%",
			padding: "30px 32px",
			borderRadius: 20,
			background: "white",
		})}
	>
		<div
			style={flex({ alignItems: "center", justifyContent: "space-between" })}
		>
			<span style={{ fontSize: 30, letterSpacing: -0.9 }}>{name}</span>
			<span
				style={{
					fontSize: 14,
					fontWeight: 500,
					padding: "5px 11px",
					borderRadius: 999,
					background: chipBg,
					color: chipColor,
				}}
			>
				{chip}
			</span>
		</div>
		<div style={flex({ marginTop: 14 })}>
			<Body size={19} lines={3}>
				{blurb}
			</Body>
		</div>
		<div style={flex({ alignItems: "flex-end", gap: 12, marginTop: 30 })}>
			<span style={{ fontSize: 68, lineHeight: 1, letterSpacing: -2.4 }}>
				{price}
			</span>
			<span
				style={{
					fontSize: 18,
					color: "rgba(17,17,17,0.6)",
					paddingBottom: 8,
				}}
			>
				{unit}
			</span>
		</div>
		<span style={{ marginTop: 18, fontSize: 16, color: "rgba(17,17,17,0.6)" }}>
			{note}
		</span>
		{children}
	</div>
);

export const PricingArt = ({
	mesh,
	pro,
}: {
	mesh: string;
	pro: { monthly: number; annualPerMonth: number; savePercent: number };
}) => (
	<MeshFrame mesh={mesh} width={500} height={620} padding={10} radius={30}>
		<PlanCardArt
			width={480}
			name="Pro"
			chip="Most popular"
			chipBg="#DCEBFC"
			chipColor="#2F62D4"
			blurb="Everything in Desktop, plus unlimited cloud sharing, AI, and team collaboration."
			price={`$${pro.monthly}`}
			unit="per user, per month"
			note={`Or $${pro.annualPerMonth} a month, billed annually.`}
		>
			<div
				style={flex({
					marginTop: 26,
					padding: 5,
					borderRadius: 14,
					border: "1px solid #E1E7EE",
				})}
			>
				<Segment label="Monthly" active />
				<Segment label="Annual" badge={`SAVE ${pro.savePercent}%`} />
			</div>
			<div
				style={flex({
					marginTop: 24,
					alignItems: "center",
					justifyContent: "space-between",
					fontSize: 17,
				})}
			>
				<span>Users</span>
				<div style={flex({ alignItems: "center", gap: 18 })}>
					<StepperDot label="−" />
					<span>1</span>
					<StepperDot label="+" />
				</div>
			</div>
			<div
				style={flex({
					marginTop: 26,
					height: 54,
					borderRadius: 13,
					alignItems: "center",
					justifyContent: "center",
					fontSize: 18,
					fontWeight: 500,
					background:
						"linear-gradient(180deg, #F5FAFE 0%, #E3EFFB 52%, #CFE2F6 100%)",
					border: "1px solid rgba(63,127,205,0.65)",
					boxShadow: "0 10px 24px -10px rgba(120,178,240,0.55)",
				})}
			>
				Get Pro
			</div>
		</PlanCardArt>
	</MeshFrame>
);

const StepperDot = ({ label }: { label: string }) => (
	<div
		style={flex({
			width: 32,
			height: 32,
			borderRadius: 9999,
			background: "#F1F4F8",
			alignItems: "center",
			justifyContent: "center",
			fontSize: 20,
			color: "rgba(17,17,17,0.6)",
		})}
	>
		{label}
	</div>
);

export const titleFontSize = (title: string) => {
	if (title.length <= 22) return 84;
	if (title.length <= 30) return 70;
	if (title.length <= 56) return 60;
	return 50;
};

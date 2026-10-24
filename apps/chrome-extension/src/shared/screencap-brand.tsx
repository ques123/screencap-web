import type { SVGProps } from "react";
import {
	STICKER_LOGO_INNER,
	STICKER_LOGO_VIEWBOX,
	STICKER_MARK_INNER,
	STICKER_MARK_VIEWBOX,
} from "./sticker";

/** Screencap sticker logo. White sticker: place it on a non-white background. */
export const ScreencapBrand = (props: SVGProps<SVGSVGElement>) => (
	<svg
		className="brand-logo sticker-logo"
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox={STICKER_LOGO_VIEWBOX}
		role="img"
		aria-label="Screencap"
		{...props}
	>
		<title>Screencap</title>
		<g dangerouslySetInnerHTML={{ __html: STICKER_LOGO_INNER }} />
	</svg>
);

/** Square sticker with just the record dot (compact spots). */
export const ScreencapMark = (props: SVGProps<SVGSVGElement>) => (
	<svg
		className="sticker-mark"
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox={STICKER_MARK_VIEWBOX}
		aria-hidden="true"
		{...props}
	>
		<g dangerouslySetInnerHTML={{ __html: STICKER_MARK_INNER }} />
	</svg>
);

export const DoodleBoilFilter = ({ id = "boil" }: { id?: string }) => (
	<filter id={id} x="-15%" y="-15%" width="130%" height="130%">
		<feTurbulence
			type="fractalNoise"
			baseFrequency="0.05"
			numOctaves="2"
			seed="1"
			result="noise"
		>
			<animate
				attributeName="seed"
				values="1;3;5;7"
				dur="0.6s"
				repeatCount="indefinite"
				calcMode="discrete"
			/>
		</feTurbulence>
		<feDisplacementMap
			in="SourceGraphic"
			in2="noise"
			scale="3"
			xChannelSelector="R"
			yChannelSelector="G"
		/>
	</filter>
);

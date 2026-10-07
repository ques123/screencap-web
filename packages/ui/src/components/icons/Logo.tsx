import {
	SCREENCAP_MARK_VIEWBOX,
	SCREENCAP_RED,
	SCREENCAP_STICKER,
	SCREENCAP_STICKER_INK,
	SCREENCAP_STICKER_MARK_VIEWBOX,
} from "./screencap-brand";

// The sticker logo: a white sticker tilted -4 degrees with the red record dot and the outlined
// "screencap" wordmark. Plain shapes only (no ids), so several logos can share a page; the shadow
// is a CSS filter on the <svg>.
const STICKER_SHADOW =
	"drop-shadow(0 1px 0 rgba(11,36,64,.14)) drop-shadow(0 4px 7px rgba(11,36,64,.2))";

const RecordDot = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => (
	<>
		<circle cx={cx} cy={cy} r={r} fill={SCREENCAP_RED} />
		<circle cx={cx - r * 0.3} cy={cy - r * 0.34} r={r * 0.27} fill="#FFFFFF" fillOpacity="0.35" />
	</>
);

export const StickerMark = () => (
	<g transform="rotate(-4 60 60)">
		<rect width="120" height="120" rx="30" fill="#FFFFFF" />
		<RecordDot cx={60} cy={60} r={31} />
	</g>
);

export const StickerLogo = () => (
	<g transform={SCREENCAP_STICKER.transform}>
		<rect
			x="0"
			y={SCREENCAP_STICKER.rect.y}
			width={SCREENCAP_STICKER.rect.width}
			height={SCREENCAP_STICKER.rect.height}
			rx={SCREENCAP_STICKER.rect.rx}
			fill="#FFFFFF"
		/>
		<RecordDot {...SCREENCAP_STICKER.dot} />
		<path
			transform={`translate(${SCREENCAP_STICKER.textX} 0)`}
			fill={SCREENCAP_STICKER_INK}
			d={SCREENCAP_STICKER.wordmark}
		/>
	</g>
);

/** @deprecated kept for older imports; the sticker mark replaced the sky tile. */
export const SkyMark = StickerMark;

export const Logo = ({
	className,
	showVersion,
	showBeta,
	white,
	hideLogoName,
	squaredMark,
	viewBoxDimensions,
	style,
}: {
	className?: string;
	showVersion?: boolean;
	showBeta?: boolean;
	white?: boolean;
	hideLogoName?: boolean;
	/** Kept for callers; the sky mark is always a squared tile now. */
	squaredMark?: boolean;
	style?: React.CSSProperties;
	viewBoxDimensions?: `${string} ${string} ${string} ${string}`;
}) => {
	// Callers still pass Cap's "0 0 120 40" box; only a mark-only request is honoured, everything
	// else gets the full sticker.
	const markOnly = hideLogoName || viewBoxDimensions === SCREENCAP_MARK_VIEWBOX;
	const viewBox = markOnly ? SCREENCAP_STICKER_MARK_VIEWBOX : SCREENCAP_STICKER.viewBox;
	return (
		<div className="flex items-center">
			<svg
				viewBox={viewBox}
				xmlns="http://www.w3.org/2000/svg"
				preserveAspectRatio="xMidYMid meet"
				fill="none"
				style={{ filter: STICKER_SHADOW, overflow: "visible", ...style }}
				role="img"
				aria-label="Screencap"
				className={className}
			>
				{markOnly ? <StickerMark /> : <StickerLogo />}
			</svg>
			{showVersion && (
				<span
					className={`text-[10px] font-medium ${
						white ? "text-white" : "text-gray-1"
					}`}
				>
					v{process.env.appVersion}
				</span>
			)}
			{showBeta && (
				<span
					className={`text-[10px] font-medium min-w-[52px] ${
						white ? "text-white" : "text-gray-1"
					}`}
				>
					Beta v{process.env.appVersion}
				</span>
			)}
		</div>
	);
};

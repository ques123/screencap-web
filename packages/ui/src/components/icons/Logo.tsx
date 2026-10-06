import {
	SCREENCAP_BRACKETS,
	SCREENCAP_DOT,
	SCREENCAP_LOGO_VIEWBOX,
	SCREENCAP_MARK_VIEWBOX,
	SCREENCAP_RED,
	SCREENCAP_WORDMARK_PATH,
} from "./screencap-brand";

// The "Open Sky" mark: the viewfinder brackets and record dot in white/red on a small sky tile
// with soft clouds (a vector take on the app icon). Plain shapes only, no gradient or clip ids,
// because several logos can share a page.
export const SkyMark = () => (
	<>
		<rect x="0.5" y="0.5" width="39" height="39" rx="10" fill="#3F8FE8" />
		<path
			d="M0.5 18H39.5V29.5A10 10 0 0 1 29.5 39.5H10.5A10 10 0 0 1 0.5 29.5Z"
			fill="#FFFFFF"
			fillOpacity="0.28"
		/>
		<ellipse cx="12" cy="33" rx="8" ry="3.5" fill="#FFFFFF" fillOpacity="0.9" />
		<ellipse cx="28" cy="34.5" rx="9" ry="3.5" fill="#FFFFFF" fillOpacity="0.9" />
		<ellipse cx="31" cy="9" rx="5" ry="2" fill="#FFFFFF" fillOpacity="0.55" />
		<g
			transform="translate(8 8) scale(0.6)"
			stroke="#FFFFFF"
			strokeWidth={5}
			strokeLinecap="round"
			strokeLinejoin="round"
			fill="none"
		>
			{SCREENCAP_BRACKETS.map((d) => (
				<path key={d} d={d} />
			))}
		</g>
		<circle cx={SCREENCAP_DOT.cx} cy={SCREENCAP_DOT.cy} r={4.4} fill={SCREENCAP_RED} />
	</>
);

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
	// Callers still pass Cap's "0 0 120 40" box; the Screencap wordmark is wider, so only a
	// mark-only box (40 wide) is honoured and everything else gets the full logo box.
	const viewBox =
		hideLogoName || viewBoxDimensions === SCREENCAP_MARK_VIEWBOX
			? SCREENCAP_MARK_VIEWBOX
			: SCREENCAP_LOGO_VIEWBOX;
	return (
		<div className="flex items-center">
			<svg
				viewBox={viewBox}
				xmlns="http://www.w3.org/2000/svg"
				preserveAspectRatio="xMidYMid meet"
				fill="none"
				style={style}
				role="img"
				aria-label="Screencap"
				className={className}
			>
				<SkyMark />
				{!hideLogoName && (
					<path
						className={white ? "fill-white" : "fill-gray-12"}
						fill={white ? "#ffffff" : "#14161A"}
						d={SCREENCAP_WORDMARK_PATH}
					/>
				)}
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

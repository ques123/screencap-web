import {
	SCREENCAP_BRACKET_STROKE,
	SCREENCAP_BRACKETS,
	SCREENCAP_DOT,
	SCREENCAP_LOGO_VIEWBOX,
	SCREENCAP_MARK_VIEWBOX,
	SCREENCAP_RED,
	SCREENCAP_WORDMARK_PATH,
} from "./screencap-brand";

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
				{squaredMark && (
					<rect
						width="39.5"
						height="39.5"
						x="0.25"
						y="0.25"
						fill="#fff"
						stroke="#E7EAF0"
						strokeWidth="0.5"
						rx="7.75"
					/>
				)}
				<g
					className={squaredMark ? "text-[#14161A]" : white ? "text-white" : "text-gray-12"}
					stroke="currentColor"
					strokeWidth={SCREENCAP_BRACKET_STROKE}
					strokeLinecap="round"
					strokeLinejoin="round"
					fill="none"
				>
					{SCREENCAP_BRACKETS.map((d) => (
						<path key={d} d={d} />
					))}
				</g>
				<circle {...SCREENCAP_DOT} fill={SCREENCAP_RED} />
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

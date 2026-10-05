import {
	SCREENCAP_BRACKET_STROKE,
	SCREENCAP_BRACKETS,
	SCREENCAP_DOT,
	SCREENCAP_INK,
	SCREENCAP_RED,
} from "./icons/screencap-brand";

export const LogoSpinner = ({ className }: { className: string }) => {
	return (
		<svg
			className={className}
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 40 40"
		>
			<rect
				width="39.5"
				height="39.5"
				x="0.25"
				y="0.25"
				fill="#fff"
				stroke="#E7EAF0"
				strokeWidth="0.5"
				rx="7.75"
			></rect>
			<g transform="translate(6 6) scale(0.7)">
				<g
					stroke={SCREENCAP_INK}
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
			</g>
		</svg>
	);
};

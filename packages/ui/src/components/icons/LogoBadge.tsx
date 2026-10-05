import {
	SCREENCAP_BRACKET_STROKE,
	SCREENCAP_BRACKETS,
	SCREENCAP_DOT,
	SCREENCAP_INK,
	SCREENCAP_RED,
} from "./screencap-brand";

export const LogoBadge = ({ className }: { className: string }) => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			fill="none"
			viewBox="0 0 40 40"
			preserveAspectRatio="xMidYMid meet"
			style={{
				aspectRatio: "1 / 1",
			}}
			role="img"
			aria-label="Screencap"
		>
			<rect width="40" height="40" fill="#fff" rx="8"></rect>
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

import { SCREENCAP_RED } from "./icons/screencap-brand";

// Loading indicator: the sticker mark (white sticker with the red record dot, as in the logo),
// spun by the caller's className. The thin edge keeps it visible on light backgrounds.
export const LogoSpinner = ({ className }: { className: string }) => {
	return (
		<svg
			className={className}
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 120 120"
			role="img"
			aria-label="Loading"
		>
			<rect
				x="1.5"
				y="1.5"
				width="117"
				height="117"
				rx="30"
				fill="#FFFFFF"
				stroke="#DCE4EE"
				strokeWidth="3"
			/>
			<circle cx="60" cy="60" r="31" fill={SCREENCAP_RED} />
			<circle cx="50.7" cy="49.5" r="8.4" fill="#FFFFFF" fillOpacity="0.35" />
		</svg>
	);
};

import { StickerMark } from "./Logo";

export const LogoBadge = ({ className }: { className: string }) => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			fill="none"
			viewBox="-14 -14 148 152"
			preserveAspectRatio="xMidYMid meet"
			style={{
				aspectRatio: "148 / 152",
				filter: "drop-shadow(0 1px 0 rgba(11,36,64,.14)) drop-shadow(0 3px 6px rgba(11,36,64,.2))",
			}}
			role="img"
			aria-label="Screencap"
		>
			<StickerMark />
		</svg>
	);
};

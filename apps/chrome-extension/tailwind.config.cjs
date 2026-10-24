const sharedConfig = require("@cap/ui/tailwind")("chrome-extension");

const scale = (name) =>
	Object.fromEntries(
		Array.from({ length: 12 }, (_, i) => [i + 1, `var(--${name}-${i + 1})`]),
	);

// Screencap brand palette. The shared config ships Cap's blue and generic
// zinc/red scales; the extension remaps them (the CSS variables behind them
// are defined in src/popup/styles.css and src/shared/brand.css).
module.exports = {
	...sharedConfig,
	theme: {
		...sharedConfig.theme,
		extend: {
			...sharedConfig.theme.extend,
			colors: {
				...sharedConfig.theme.extend.colors,
				blue: { ...scale("blue"), 500: "#1e66b8", 600: "#1e66b8", 700: "#17559b" },
				red: {
					...scale("red"),
					500: "#ff4a2e",
					600: "#e03a20",
					700: "#c52f17",
				},
				navy: "#0b2440",
				sky: "#eaf3fc",
				rec: "#ff4a2e",
				sun: "#ffd84d",
				brand: "#1e66b8",
			},
			fontFamily: {
				...sharedConfig.theme.extend.fontFamily,
				display: [
					"Bricolage Grotesque",
					"ui-sans-serif",
					"system-ui",
					"sans-serif",
				],
			},
		},
	},
	content: [
		"./popup.html",
		"./popup-window.html",
		"./options.html",
		"./camera-preview.html",
		"./camera-permission.html",
		"./src/**/*.{ts,tsx}",
	],
};

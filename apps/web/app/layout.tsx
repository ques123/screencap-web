import "@/app/globals.css";
import { buildEnv } from "@cap/env";
import { OpenPanelComponent } from "@openpanel/nextjs";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import type { PropsWithChildren } from "react";

const defaultFont = Geist({
	subsets: ["latin"],
	weight: ["300", "400", "500", "600", "700"],
	display: "swap",
});

const SITE_TITLE = "Screencap: screen recordings, one link away";
const SITE_DESCRIPTION = "Record your screen and share it with a link.";

export const metadata: Metadata = {
	metadataBase: new URL("https://screencap.co"),
	title: SITE_TITLE,
	description: SITE_DESCRIPTION,
	openGraph: {
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		type: "website",
		url: "https://screencap.co",
		siteName: "Screencap",
		images: [{ url: "/og.png", width: 1200, height: 630, alt: "Screencap" }],
	},
	twitter: {
		card: "summary_large_image",
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		images: ["/og.png"],
	},
};

// Self-hosted analytics (Umami + Matomo on ptrack.xyz). Query strings are dropped because sign-in
// and invite URLs can carry email addresses or tokens.
const UMAMI_WEBSITE_ID = "7074ec6f-e024-462c-a01f-613a3255bea8";
const MATOMO_SITE_ID = "6";
const MATOMO_SNIPPET = `var _paq = window._paq = window._paq || [];
_paq.push(['disableCookies']);
_paq.push(['setCustomUrl', location.origin + location.pathname]);
_paq.push(['trackPageView']);
_paq.push(['enableLinkTracking']);
(function() {
  var u = 'https://ptrack.xyz/';
  _paq.push(['setTrackerUrl', u + 'm']);
  _paq.push(['setSiteId', '${MATOMO_SITE_ID}']);
  var d = document, g = d.createElement('script'), s = d.getElementsByTagName('script')[0];
  g.async = true; g.src = u + 'm.js'; s.parentNode.insertBefore(g, s);
})();`;

export default function RootLayout({ children }: PropsWithChildren) {
	return (
		// suppressHydrationWarning: the Cap Chrome extension stamps
		// data-cap-chrome-extension-installed on <html> at document_idle,
		// which can land before hydration finishes.
		<html className={defaultFont.className} lang="en" suppressHydrationWarning>
			<head>
				<link
					rel="apple-touch-icon"
					sizes="180x180"
					href="/apple-touch-icon.png"
				/>
				<link
					rel="icon"
					type="image/png"
					sizes="32x32"
					href="/favicon-32x32.png"
				/>
				<link
					rel="icon"
					type="image/png"
					sizes="16x16"
					href="/favicon-16x16.png"
				/>
				<link rel="manifest" href="/site.webmanifest" />
				<link rel="mask-icon" href="/safari-pinned-tab.svg" color="#14161A" />
				<link rel="shortcut icon" href="/favicon.ico" />
				<meta name="msapplication-TileColor" content="#ffffff" />
				<meta name="theme-color" content="#ffffff" />
			</head>
			<body suppressHydrationWarning>
				<Script src="/theme-script.js" strategy="beforeInteractive" />
				<Script
					src="https://ptrack.xyz/q.js"
					data-website-id={UMAMI_WEBSITE_ID}
					data-exclude-search="true"
					strategy="afterInteractive"
				/>
				<Script id="matomo" strategy="afterInteractive">
					{MATOMO_SNIPPET}
				</Script>
				{buildEnv.NEXT_PUBLIC_OPENPANEL_CLIENT_ID ? (
					<OpenPanelComponent
						apiUrl="/api/op"
						clientId={buildEnv.NEXT_PUBLIC_OPENPANEL_CLIENT_ID}
						scriptUrl="/api/op/op1.js"
						trackOutgoingLinks
						trackScreenViews
					/>
				) : null}
				<main className="w-full">{children}</main>
			</body>
		</html>
	);
}

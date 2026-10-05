import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Download Screencap",
	description: "Download Screencap for macOS (Apple Silicon and Intel).",
};

export default async function DownloadPage(props: {
	searchParams?: Promise<{ unavailable?: string }>;
}) {
	const searchParams = await props.searchParams;
	const unavailable = searchParams?.unavailable === "1";

	return (
		<main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-6 px-6 py-24 text-center">
			<h1 className="text-4xl font-semibold">Download Screencap</h1>
			{unavailable && (
				<p className="text-gray-11">
					Screencap is for Mac only. On Windows or Linux, record in your browser
					from the dashboard.
				</p>
			)}
			<p className="text-gray-11">Screencap for macOS</p>
			<div className="flex flex-wrap items-center justify-center gap-3">
				<a
					href="/download/apple-silicon"
					className="rounded-full bg-gray-12 px-6 py-3 font-medium text-gray-1"
				>
					Download for Apple Silicon
				</a>
				<a
					href="/download/apple-intel"
					className="rounded-full border border-gray-5 px-6 py-3 font-medium"
				>
					Download for Intel
				</a>
			</div>
			<p className="text-sm text-gray-10">
				Windows and Linux are not supported. Use the browser recorder from your
				dashboard instead.
			</p>
		</main>
	);
}

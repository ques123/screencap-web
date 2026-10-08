const REPO_URL = "https://github.com/ques123/screencap-web";

export const SelfHostingPage = () => {
	return (
		<main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col gap-6 px-6 pt-40 pb-24">
			<h1 className="text-4xl font-semibold text-gray-12">
				Self-host Screencap
			</h1>
			<p className="text-lg text-gray-11">
				Screencap is open source under the AGPL-3.0. The repository is the
				complete source for the service at screencap.co and the Mac app, so you
				can read it, build it and run it yourself.
			</p>
			<p className="text-gray-11">
				It is a fork of Cap. The README lists what changed from upstream and how
				to build the Mac app from source. The Mac app can still use screencap.co
				for sign-in, sharing and hosting.
			</p>
			<div className="flex flex-wrap gap-3">
				<a
					href={REPO_URL}
					target="_blank"
					rel="noopener noreferrer"
					className="rounded-full bg-gray-12 px-6 py-3 font-medium text-gray-1"
				>
					View the source on GitHub
				</a>
				<a
					href="/download"
					className="rounded-full border border-gray-5 px-6 py-3 font-medium text-gray-12"
				>
					Download Screencap
				</a>
			</div>
		</main>
	);
};

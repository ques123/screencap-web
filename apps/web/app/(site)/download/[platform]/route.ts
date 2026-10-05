import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const RELEASE_BASE =
	"https://github.com/ques123/screencap-web/releases/latest/download";
const APPLE_SILICON_URL = `${RELEASE_BASE}/Screencap_aarch64.dmg`;
const INTEL_URL = `${RELEASE_BASE}/Screencap_x64.dmg`;

const DOWNLOAD_URLS: Record<string, string> = {
	"apple-silicon": APPLE_SILICON_URL,
	"apple-aarch64": APPLE_SILICON_URL,
	"apple-arm64": APPLE_SILICON_URL,
	"macos-aarch64": APPLE_SILICON_URL,
	"macos-arm64": APPLE_SILICON_URL,
	aarch64: APPLE_SILICON_URL,
	arm64: APPLE_SILICON_URL,
	"apple-intel": INTEL_URL,
	"apple-x64": INTEL_URL,
	"apple-x86_64": INTEL_URL,
	"macos-x64": INTEL_URL,
	"macos-x86_64": INTEL_URL,
	x64: INTEL_URL,
	x86_64: INTEL_URL,
	intel: INTEL_URL,
};

export async function GET(
	request: NextRequest,
	props: { params: Promise<{ platform: string }> },
) {
	const params = await props.params;
	const platform = params.platform?.toLowerCase();
	if (!platform) {
		return NextResponse.redirect(new URL("/download", request.url));
	}

	const url = DOWNLOAD_URLS[platform];
	if (url) return NextResponse.redirect(url);

	// Windows, Linux and anything else: Screencap is Mac only.
	return NextResponse.redirect(new URL("/download?unavailable=1", request.url));
}

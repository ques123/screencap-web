// Unused: the desktop updater reads latest.json directly from GitHub Releases.
export const runtime = "edge";

export async function GET() {
	return new Response(null, { status: 404 });
}

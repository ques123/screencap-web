// We do not publish a standalone CLI.
export async function GET() {
	return new Response(null, { status: 404 });
}

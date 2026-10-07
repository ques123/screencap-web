import { serverEnv } from "@cap/env";
import { getAdminUser, openWithReporterKey } from "@/lib/screencap-admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	if (request.headers.get("sec-fetch-site") === "cross-site")
		return new Response("Not found", { status: 404 });
	const admin = await getAdminUser();
	if (!admin) return new Response("Not found", { status: 404 });

	const form = await request.formData().catch(() => null);
	const videoId = form?.get("videoId");
	const reportRaw = form?.get("reportId");
	if (typeof videoId !== "string" || !/^[A-Za-z0-9_-]{6,64}$/.test(videoId))
		return new Response("Bad request", { status: 400 });
	const reportId =
		typeof reportRaw === "string" && /^\d{1,10}$/.test(reportRaw)
			? Number(reportRaw)
			: undefined;

	let path: string | null;
	try {
		path = await openWithReporterKey(videoId, admin.email, reportId);
	} catch {
		return new Response("Could not record this view", { status: 500 });
	}
	if (!path) return new Response("No key on file", { status: 404 });

	return new Response(null, {
		status: 303,
		headers: {
			Location: new URL(path, serverEnv().WEB_URL).toString(),
			"Cache-Control": "no-store",
			"Referrer-Policy": "no-referrer",
		},
	});
}

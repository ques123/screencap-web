import { purgeDue } from "@/lib/screencap-admin";
import { isCronAuthorized, notFound } from "../_guard";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	if (!isCronAuthorized(request.headers.get("x-screencap-cron")))
		return notFound();
	try {
		return Response.json(await purgeDue());
	} catch (e) {
		return Response.json(
			{ error: e instanceof Error ? e.message : "purge failed" },
			{ status: 500 },
		);
	}
}

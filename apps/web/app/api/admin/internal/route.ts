import { db } from "@cap/database";
import { users } from "@cap/database/schema";
import { eq } from "drizzle-orm";
import {
	blockUser,
	listAdminLog,
	listRecordings,
	listUsers,
	removeRecording,
	restoreRecording,
	unblockUser,
} from "@/lib/screencap-admin";
import { isCronAuthorized, notFound } from "../_guard";

export const dynamic = "force-dynamic";

const ADMIN = "cli:admin.sh";

type Body = {
	action?: string;
	userId?: string;
	email?: string;
	videoId?: string;
	reason?: string;
	source?: string;
	notify?: boolean;
	quarantine?: boolean;
	q?: string;
	limit?: number;
	offset?: number;
	before?: number;
};

function str(v: unknown): string | undefined {
	return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

// admin.sh identifies people by email; the services take a user id.
async function resolveUserId(body: Body): Promise<string | undefined> {
	const id = str(body.userId);
	if (id) return id;
	const email = str(body.email)?.toLowerCase();
	if (!email) return undefined;
	const [row] = await db()
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, email))
		.limit(1);
	return row ? String(row.id) : undefined;
}

function bad(error: string) {
	return Response.json({ ok: false, error }, { status: 400 });
}

export async function POST(request: Request) {
	if (!isCronAuthorized(request.headers.get("x-screencap-cron")))
		return notFound();

	let body: Body;
	try {
		body = (await request.json()) as Body;
	} catch {
		return bad("Invalid JSON");
	}

	const reason = str(body.reason);
	const source = body.source === "report" ? "report" : "own";
	const input = { adminEmail: ADMIN, reason, source } as const;
	const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 500);
	const offset = Math.max(Number(body.offset) || 0, 0);

	try {
		switch (body.action) {
			case "block": {
				const userId = await resolveUserId(body);
				if (!userId) return bad("No account with that email or id");
				return Response.json(
					await blockUser(userId, { ...input, notify: Boolean(body.notify) }),
				);
			}
			case "unblock": {
				const userId = await resolveUserId(body);
				if (!userId) return bad("No account with that email or id");
				return Response.json(await unblockUser(userId, input));
			}
			case "remove-recording": {
				const videoId = str(body.videoId);
				if (!videoId) return bad("videoId is required");
				return Response.json(
					await removeRecording(videoId, {
						...input,
						notify: Boolean(body.notify),
						quarantine: Boolean(body.quarantine),
					}),
				);
			}
			case "restore-recording": {
				const videoId = str(body.videoId);
				if (!videoId) return bad("videoId is required");
				return Response.json(await restoreRecording(videoId, ADMIN));
			}
			case "users":
				return Response.json(
					await listUsers({ q: str(body.q), limit, offset }),
				);
			case "recordings":
				return Response.json(
					await listRecordings({
						q: str(body.q) ?? str(body.email)?.toLowerCase(),
						limit,
						offset,
					}),
				);
			case "log":
				return Response.json({
					rows: await listAdminLog({
						limit,
						before: body.before ? Number(body.before) : undefined,
					}),
				});
			default:
				return bad("Unknown action");
		}
	} catch (e) {
		return Response.json(
			{ ok: false, error: e instanceof Error ? e.message : "failed" },
			{ status: 500 },
		);
	}
}

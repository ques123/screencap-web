import {
	adminLogToCsv,
	listAdminLog,
	requireAdmin,
} from "@/lib/screencap-admin";

export const dynamic = "force-dynamic";

export async function GET() {
	await requireAdmin();
	const rows = await listAdminLog({ limit: 5000 });
	const stamp = new Date().toISOString().slice(0, 10);
	return new Response(adminLogToCsv(rows), {
		headers: {
			"content-type": "text/csv; charset=utf-8",
			"content-disposition": `attachment; filename="screencap-admin-log-${stamp}.csv"`,
			"cache-control": "no-store",
		},
	});
}

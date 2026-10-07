import { Button } from "@cap/ui";
import Link from "next/link";
import { listAdminLog } from "@/lib/screencap-admin";
import { Chip, DateText, EmptyState, pageParam } from "../_components/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminLogPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const sp = await searchParams;
	const beforeNum = pageParam(sp.before);
	const before = sp.before ? beforeNum : undefined;
	const rows = await listAdminLog({ limit: PAGE_SIZE + 1, before });
	const hasMore = rows.length > PAGE_SIZE;
	const shown = rows.slice(0, PAGE_SIZE);
	const last = shown[shown.length - 1];

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-sm text-gray-11">
					Every admin action, newest first.
				</p>
				<Button href="/api/admin/log.csv" size="sm" variant="outline">
					Download CSV
				</Button>
			</div>
			{shown.length === 0 ? (
				<EmptyState>Nothing has been logged yet.</EmptyState>
			) : (
				<ul className="rounded-xl border border-gray-4 bg-gray-2 divide-y divide-gray-4">
					{shown.map((e) => (
						<li key={e.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
							<div className="flex flex-wrap gap-2 items-center">
								<span className="font-mono text-xs text-gray-12">
									{e.action}
								</span>
								<Chip>{e.targetType}</Chip>
								{e.notified && <Chip tone="blue">Owner emailed</Chip>}
								<span className="text-xs text-gray-10">
									<DateText value={e.at} />
								</span>
							</div>
							<p className="text-gray-12 break-all">
								{e.targetLabel || e.targetId || "-"}
							</p>
							<p className="text-xs text-gray-10 break-all">
								by {e.adminEmail}
								{e.source ? ` · source: ${e.source}` : ""}
							</p>
							{e.reason && (
								<p className="text-xs text-gray-11 break-words">
									Reason: {e.reason}
								</p>
							)}
						</li>
					))}
				</ul>
			)}
			{hasMore && last && (
				<div className="flex justify-end">
					<Link
						href={`/dashboard/admin/log?before=${last.id}`}
						className="px-3 py-1.5 text-sm rounded-full border border-gray-4 hover:bg-gray-3 text-gray-12"
					>
						Older entries
					</Link>
				</div>
			)}
		</div>
	);
}

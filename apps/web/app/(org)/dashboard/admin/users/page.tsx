import Link from "next/link";
import { listUsers } from "@/lib/screencap-admin";
import {
	Chip,
	DateText,
	EmptyState,
	formatDuration,
	formatNumber,
	pageParam,
	strParam,
} from "../_components/format";
import { Pager, SearchBar } from "../_components/Pager";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function AdminUsersPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const sp = await searchParams;
	const q = strParam(sp.q);
	const page = pageParam(sp.page);
	const { rows, total } = await listUsers({
		q: q || undefined,
		limit: PAGE_SIZE,
		offset: (page - 1) * PAGE_SIZE,
	});

	return (
		<div className="flex flex-col gap-4">
			<SearchBar
				action="/dashboard/admin/users"
				q={q}
				placeholder="Search by email, name or user id"
			/>
			{rows.length === 0 ? (
				<EmptyState>
					{q ? `No users match "${q}".` : "No users yet."}
				</EmptyState>
			) : (
				<div className="rounded-xl border border-gray-4 bg-gray-2 divide-y divide-gray-4">
					<div className="hidden px-4 py-2 text-xs text-gray-10 md:grid md:grid-cols-[minmax(0,2fr)_6rem_7rem_8rem_8rem] gap-3">
						<span>User</span>
						<span>Recordings</span>
						<span>Stored</span>
						<span>Joined</span>
						<span>Last active</span>
					</div>
					{rows.map((u) => (
						<Link
							key={u.id}
							href={`/dashboard/admin/users/${u.id}`}
							className="flex flex-col gap-1 px-4 py-3 text-sm hover:bg-gray-3 md:grid md:grid-cols-[minmax(0,2fr)_6rem_7rem_8rem_8rem] md:gap-3 md:items-center"
						>
							<div className="min-w-0 space-y-1">
								<p className="font-medium text-gray-12 break-all">{u.email}</p>
								<div className="flex flex-wrap gap-1.5 items-center">
									{u.name && (
										<span className="text-xs text-gray-10">{u.name}</span>
									)}
									{u.blocked && <Chip tone="red">Blocked</Chip>}
									{u.proRevoked && <Chip tone="amber">Pro revoked</Chip>}
								</div>
							</div>
							<span className="text-gray-11">
								<span className="md:hidden text-gray-10">Recordings: </span>
								{formatNumber(u.recordings)}
							</span>
							<span className="text-gray-11">
								<span className="md:hidden text-gray-10">Stored: </span>
								{formatDuration(u.storedSeconds)}
							</span>
							<span className="text-gray-11">
								<span className="md:hidden text-gray-10">Joined: </span>
								<DateText value={u.createdAt} />
							</span>
							<span className="text-gray-11">
								<span className="md:hidden text-gray-10">Last active: </span>
								<DateText value={u.lastActiveAt} />
							</span>
						</Link>
					))}
				</div>
			)}
			<Pager
				basePath="/dashboard/admin/users"
				params={q ? { q } : {}}
				page={page}
				pageSize={PAGE_SIZE}
				total={total}
			/>
		</div>
	);
}

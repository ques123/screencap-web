import { Card, CardDescription, CardTitle } from "@cap/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserDetail } from "@/lib/screencap-admin";
import {
	absoluteDate,
	Chip,
	DateText,
	EmptyState,
	formatDuration,
	formatNumber,
	RecordedWithText,
} from "../../_components/format";
import { RecordingActions } from "../../_components/RecordingActions";
import { UserControls } from "./UserControls";

export const dynamic = "force-dynamic";

export default async function AdminUserPage({
	params,
}: {
	params: Promise<{ userId: string }>;
}) {
	const { userId } = await params;
	const u = await getUserDetail(userId);
	if (!u) notFound();

	return (
		<div className="flex flex-col gap-6">
			<Link
				href="/dashboard/admin/users"
				className="text-sm text-gray-11 hover:text-gray-12"
			>
				Back to users
			</Link>
			<Card className="space-y-3">
				<div className="flex flex-wrap gap-2 items-center">
					<CardTitle className="break-all">{u.email}</CardTitle>
					{u.blocked && <Chip tone="red">Blocked</Chip>}
					{u.proRevoked && <Chip tone="amber">Pro revoked</Chip>}
				</div>
				<CardDescription>
					{u.name ? `${u.name} · ` : ""}
					<span className="font-mono">{u.id}</span>
				</CardDescription>
				<dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
					<div>
						<dt className="text-gray-10">Joined</dt>
						<dd className="text-gray-12">
							<DateText value={u.createdAt} />
						</dd>
					</div>
					<div>
						<dt className="text-gray-10">Last active</dt>
						<dd className="text-gray-12">
							<DateText value={u.lastActiveAt} />
						</dd>
					</div>
					<div>
						<dt className="text-gray-10">Recordings</dt>
						<dd className="text-gray-12">{formatNumber(u.recordings)}</dd>
					</div>
					<div>
						<dt className="text-gray-10">Stored</dt>
						<dd className="text-gray-12">{formatDuration(u.storedSeconds)}</dd>
					</div>
				</dl>
				{u.blocked && (
					<p className="text-sm text-red-600">
						Blocked
						{u.blockedAt ? ` on ${absoluteDate(u.blockedAt)}` : ""}
						{u.blockReason ? `: ${u.blockReason}` : "."}
					</p>
				)}
			</Card>

			<Card className="space-y-4">
				<CardTitle>Apps</CardTitle>
				{u.clients.installed.length === 0 ? (
					<p className="text-sm text-gray-10">
						No Screencap app has signed in to this account.
					</p>
				) : (
					<ul className="space-y-2 text-sm">
						{u.clients.installed.map((c) => (
							<li
								key={`${c.label}-${c.version ?? ""}`}
								className="flex flex-wrap gap-x-3 gap-y-1 items-baseline"
							>
								<span className="font-medium text-gray-12">
									{c.label}
									{c.version ? ` ${c.version}` : ""}
								</span>
								{c.inferred && (
									<span className="text-xs text-gray-10">
										version unknown (signed in before versions were recorded)
									</span>
								)}
								{c.lastSeenAt && (
									<span className="text-xs text-gray-10">
										last used <DateText value={c.lastSeenAt} />
									</span>
								)}
								{c.firstSeenAt && (
									<span className="text-xs text-gray-10">
										first seen <DateText value={c.firstSeenAt} />
									</span>
								)}
							</li>
						))}
					</ul>
				)}
				{u.clients.recordedWith.length > 0 && (
					<div className="space-y-1">
						<p className="text-xs text-gray-10">Recordings made with</p>
						<div className="flex flex-wrap gap-1.5">
							{u.clients.recordedWith.map((r) => (
								<Chip key={r.label}>
									{r.label}: {formatNumber(r.count)}
								</Chip>
							))}
						</div>
					</div>
				)}
			</Card>

			<UserControls
				userId={u.id}
				email={u.email}
				blocked={u.blocked}
				proRevoked={u.proRevoked}
				storageHoursOverride={u.storageHoursOverride}
				recordingMinutesOverride={u.recordingMinutesOverride}
				note={u.note}
				limits={{
					storageHours: u.limits.storageHours,
					recordingMinutes: u.limits.recordingMinutes,
				}}
			/>

			<div className="space-y-3">
				<h2 className="text-base font-medium text-gray-12">
					Recent recordings
				</h2>
				{u.recentRecordings.length === 0 ? (
					<EmptyState>This user has no recordings.</EmptyState>
				) : (
					<ul className="rounded-xl border border-gray-4 bg-gray-2 divide-y divide-gray-4">
						{u.recentRecordings.map((r) => (
							<li key={r.id} className="flex flex-col gap-3 px-4 py-3 text-sm">
								<div className="space-y-1">
									<div className="flex flex-wrap gap-2 items-center">
										<span className="font-medium text-gray-12 break-words">
											{r.title || "(untitled)"}
										</span>
										{r.e2ee && <Chip tone="blue">E2EE</Chip>}
										<Chip tone={r.public ? "blue" : "gray"}>
											{r.public ? "Public" : "Private"}
										</Chip>
										{r.openReports > 0 && (
											<Chip tone="red">{r.openReports} open</Chip>
										)}
									</div>
									<p className="text-xs text-gray-10">
										{formatDuration(r.durationSeconds)} ·{" "}
										{formatNumber(r.views)} views ·{" "}
										<DateText value={r.createdAt} />
									</p>
									<p className="text-xs text-gray-10">
										<RecordedWithText value={r.recordedWith} />
									</p>
								</div>
								<RecordingActions
									videoId={r.id}
									title={r.title}
									isPublic={r.public}
									ownerEmail={r.ownerEmail}
									e2ee={r.e2ee}
									hasReporterKey={r.hasReporterKey}
								/>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}

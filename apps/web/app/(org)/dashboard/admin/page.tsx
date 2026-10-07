import { Card, CardDescription, CardTitle } from "@cap/ui";
import Link from "next/link";
import { overviewStats } from "@/lib/screencap-admin";
import {
	Chip,
	DateText,
	formatDuration,
	formatNumber,
} from "./_components/format";

export const dynamic = "force-dynamic";

function Stat({
	label,
	value,
	hint,
	href,
	tone,
}: {
	label: string;
	value: string;
	hint?: string;
	href?: string;
	tone?: "alert";
}) {
	const body = (
		<Card
			className={`space-y-1 h-full ${tone === "alert" ? "border-red-500/40" : ""}`}
		>
			<CardDescription>{label}</CardDescription>
			<p className="text-2xl font-medium text-gray-12">{value}</p>
			{hint && <p className="text-xs text-gray-10">{hint}</p>}
		</Card>
	);
	return href ? (
		<Link href={href} className="block">
			{body}
		</Link>
	) : (
		body
	);
}

const providerNames = {
	cloudflare: "Cloudflare Email",
	brevo: "Brevo",
	resend: "Resend",
	none: "None set up",
} as const;

export default async function AdminOverviewPage() {
	const s = await overviewStats();
	const emailTotal = s.email24h.sent + s.email24h.failed;
	return (
		<div className="flex flex-col gap-6">
			<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
				<Stat
					label="Open reports"
					value={formatNumber(s.openReports)}
					hint={s.openReports > 0 ? "Waiting for a decision" : "All clear"}
					href="/dashboard/admin/reports"
					tone={s.openReports > 0 ? "alert" : undefined}
				/>
				<Stat
					label="Removed, waiting"
					value={formatNumber(s.removedPending)}
					hint="Can still be restored"
					href="/dashboard/admin/removed"
				/>
				<Stat
					label="Blocked users"
					value={formatNumber(s.blockedUsers)}
					href="/dashboard/admin/users"
				/>
				<Stat label="Views, last 7 days" value={formatNumber(s.views7d)} />
				<Stat
					label="Users"
					value={formatNumber(s.users)}
					hint={`${formatNumber(s.signups24h)} today, ${formatNumber(s.signups7d)} this week`}
					href="/dashboard/admin/users"
				/>
				<Stat
					label="Recordings"
					value={formatNumber(s.recordings)}
					href="/dashboard/admin/recordings"
				/>
				<Stat
					label="Video stored"
					value={formatDuration(s.storedSeconds)}
					hint="Total recording time"
				/>
				<Stat
					label="Emails, last 24 hours"
					value={formatNumber(emailTotal)}
					hint={`${formatNumber(s.email24h.failed)} failed`}
					tone={s.email24h.failed > 0 ? "alert" : undefined}
				/>
			</div>

			<Card className="space-y-3">
				<div className="space-y-1">
					<CardTitle>Email health</CardTitle>
					<CardDescription>
						{s.emailProvider === "none"
							? "No email provider is set up, so no emails leave the app."
							: `Sending through ${providerNames[s.emailProvider]}.`}
					</CardDescription>
				</div>
				{s.recentEmailFailures.length === 0 ? (
					<p className="text-sm text-gray-10">No recent failures.</p>
				) : (
					<ul className="divide-y divide-gray-4">
						{s.recentEmailFailures.map((f) => (
							<li
								key={`${new Date(f.at).getTime()}-${f.toEmail}-${f.subject}`}
								className="py-3 space-y-1 text-sm"
							>
								<div className="flex flex-wrap gap-2 items-center">
									<Chip tone="red">Failed</Chip>
									<Chip>{f.provider}</Chip>
									<span className="text-gray-11">
										<DateText value={f.at} />
									</span>
								</div>
								<p className="text-gray-12 break-all">
									{f.subject} to {f.toEmail}
								</p>
								{f.error && (
									<p className="text-xs text-gray-10 break-words">{f.error}</p>
								)}
							</li>
						))}
					</ul>
				)}
			</Card>
		</div>
	);
}

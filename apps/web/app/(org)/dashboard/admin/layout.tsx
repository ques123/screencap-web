import type { Metadata } from "next";
import type { ReactNode } from "react";
import { openReportCount, requireAdmin } from "@/lib/screencap-admin";
import { AdminTabs } from "./_components/AdminTabs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Admin · Screencap",
	robots: { index: false, follow: false },
};

export default async function AdminLayout({
	children,
}: {
	children: ReactNode;
}) {
	await requireAdmin();
	const open = await openReportCount().catch(() => 0);
	return (
		<div className="flex flex-col gap-6">
			<div className="space-y-1">
				<h1 className="text-xl font-medium text-gray-12">Admin</h1>
				<p className="text-sm text-gray-10">
					Everything here is logged with your email.
				</p>
			</div>
			<AdminTabs openReports={open} />
			{children}
		</div>
	);
}

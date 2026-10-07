"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
	{ href: "/dashboard/admin", label: "Overview" },
	{ href: "/dashboard/admin/users", label: "Users" },
	{ href: "/dashboard/admin/recordings", label: "Recordings" },
	{ href: "/dashboard/admin/reports", label: "Reports" },
	{ href: "/dashboard/admin/removed", label: "Removed" },
	{ href: "/dashboard/admin/log", label: "Log" },
	{ href: "/dashboard/admin/settings", label: "Settings" },
];

export function AdminTabs({ openReports }: { openReports: number }) {
	const pathname = usePathname();
	return (
		<nav
			aria-label="Admin sections"
			className="flex gap-1 -mx-1 overflow-x-auto border-b border-gray-4 pb-px"
		>
			{TABS.map((t) => {
				const active =
					t.href === "/dashboard/admin"
						? pathname === t.href
						: pathname.startsWith(t.href);
				return (
					<Link
						key={t.href}
						href={t.href}
						aria-current={active ? "page" : undefined}
						className={`flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${
							active
								? "border-gray-12 text-gray-12 font-medium"
								: "border-transparent text-gray-10 hover:text-gray-12"
						}`}
					>
						{t.label}
						{t.label === "Reports" && openReports > 0 && (
							<span className="px-1.5 text-[11px] font-medium rounded-full bg-red-500 text-white">
								{openReports}
							</span>
						)}
					</Link>
				);
			})}
		</nav>
	);
}

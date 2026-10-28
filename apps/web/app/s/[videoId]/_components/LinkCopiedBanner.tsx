"use client";

import Link from "next/link";
import { useState } from "react";

export function LinkCopiedBanner() {
	const [visible, setVisible] = useState(true);
	if (!visible) return null;

	return (
		<output className="fixed left-1/2 top-4 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-green-6 bg-green-3 px-4 py-3 text-sm text-green-12 shadow-lg">
			<span>
				Link copied.{" "}
				<Link href="/dashboard/caps" className="font-medium underline">
					Go to your dashboard
				</Link>
			</span>
			<button
				type="button"
				onClick={() => setVisible(false)}
				aria-label="Dismiss"
				className="text-green-11 hover:text-green-12"
			>
				Dismiss
			</button>
		</output>
	);
}

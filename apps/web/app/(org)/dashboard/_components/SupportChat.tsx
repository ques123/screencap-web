"use client";

import Script from "next/script";
import { useEffect } from "react";

// Screencap support chat: TicketDM website "Screencap" (DharmaLoop Support Telegram group, origins
// limited to screencap.co). Signed-in users are identified so support can find their account.
const TICKETDM_KEY = "pk_live_ibpzj4vc6i65fb4m";

export function SupportChat({
	userId,
	email,
	name,
}: {
	userId: string;
	email: string;
	name: string | null;
}) {
	useEffect(() => {
		const w = window as unknown as {
			TicketDM?: {
				_l?: number;
				q?: unknown[][];
				identify?: (d: Record<string, string>) => void;
			};
		};
		const d: Record<string, string> = { userId, email };
		if (name) d.name = name;
		if (w.TicketDM?._l && w.TicketDM.identify) {
			w.TicketDM.identify(d);
			return;
		}
		// Not loaded yet: the loader replays this pre-load queue.
		const td = w.TicketDM || {};
		td.q = td.q || [];
		td.q.push(["identify", d]);
		w.TicketDM = td;
	}, [userId, email, name]);

	return (
		<Script
			src="https://ticketdm.com/w.js"
			data-key={TICKETDM_KEY}
			data-cfasync="false"
			strategy="afterInteractive"
		/>
	);
}

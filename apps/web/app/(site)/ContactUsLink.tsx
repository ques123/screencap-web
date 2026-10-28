"use client";

// Opens the TicketDM support chat (loaded by the site layout); falls back to email when the
// widget is blocked or hasn't loaded.
export function ContactUsLink({ className }: { className?: string }) {
	return (
		<a
			href="mailto:email@screencap.co"
			className={className}
			onClick={(e) => {
				const td = (window as unknown as { TicketDM?: { open?: () => void } })
					.TicketDM;
				if (td?.open) {
					e.preventDefault();
					td.open();
				}
			}}
		>
			Contact us
		</a>
	);
}

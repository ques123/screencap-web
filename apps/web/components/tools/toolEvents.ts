import { useEffect } from "react";
import type { ToolSlug, ToolStep } from "@/lib/tool-events";

export type { ToolSlug, ToolStep };

export type ToolEventProps = {
	fileSizeBytes?: number;
	durationSeconds?: number;
	outputSizeBytes?: number;
	errorClass?: string;
};

const visitId: string =
	typeof crypto !== "undefined" && "randomUUID" in crypto
		? crypto.randomUUID()
		: "";

export function toolEvent(
	tool: ToolSlug,
	step: ToolStep,
	props: ToolEventProps = {},
): void {
	if (typeof window === "undefined") return;
	try {
		const body = JSON.stringify({
			tool,
			step,
			visitId,
			fileSizeBytes: props.fileSizeBytes,
			durationSeconds: props.durationSeconds,
			outputSizeBytes: props.outputSizeBytes,
			errorClass: props.errorClass?.slice(0, 64),
			referrer: document.referrer,
			pageUrl: window.location.href,
		});
		const url = "/api/tools/events";
		if (
			typeof navigator.sendBeacon === "function" &&
			navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }))
		)
			return;
		void fetch(url, {
			method: "POST",
			body,
			keepalive: true,
			headers: { "Content-Type": "text/plain" },
		}).catch(() => {});
	} catch {}
}

export function useToolView(tool: ToolSlug): void {
	useEffect(() => {
		toolEvent(tool, "view");
	}, [tool]);
}

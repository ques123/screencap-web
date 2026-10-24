import { useEffect } from "react";
import { isToolSlug, type ToolSlug, type ToolStep } from "@/lib/tool-events";

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

const LEGACY_STEPS: Array<[RegExp, ToolStep, string?]> = [
	[/_invalid_file_type$/, "convert_failed", "invalid_file_type"],
	[/_file_too_large$/, "convert_failed", "file_too_large"],
	[/_file_selected$/, "file_selected"],
	[/_(conversion|action)_started$/, "convert_started"],
	[/_(conversion|action)_failed$/, "convert_failed"],
	[/_(conversion|action)_completed$/, "convert_ok"],
	[/_download_clicked$/, "downloaded"],
];

const ERROR_CLASSES: Array<[RegExp, string]> = [
	[/cancel|abort/i, "cancelled"],
	[
		/webcodecs|not supported|unsupported|isConfigSupported/i,
		"unsupported_browser",
	],
	[/decod/i, "decode_failed"],
	[/encod/i, "encode_failed"],
	[/memory|allocat|quota/i, "out_of_memory"],
	[/mediarecorder/i, "recorder_failed"],
];

function errorClassOf(message: unknown): string {
	const text = typeof message === "string" ? message : "";
	return ERROR_CLASSES.find(([re]) => re.test(text))?.[1] ?? "other";
}

export function trackLegacyToolEvent(
	tool: string,
	name: string,
	props: Record<string, unknown> = {},
): void {
	if (!isToolSlug(tool)) return;
	const match = LEGACY_STEPS.find(([re]) => re.test(name));
	if (!match) return;
	const [, step, fixedError] = match;
	const num = (v: unknown) => (typeof v === "number" ? v : undefined);
	toolEvent(tool, step, {
		fileSizeBytes: num(props.fileSize),
		outputSizeBytes: num(props.outputSize),
		errorClass:
			step === "convert_failed"
				? (fixedError ?? errorClassOf(props.error))
				: undefined,
	});
}

export function useToolView(tool: ToolSlug): void {
	useEffect(() => {
		toolEvent(tool, "view");
	}, [tool]);
}

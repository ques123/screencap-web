import type { RecordingStatus } from "./types";

/**
 * When the action popup closes, the service worker normally tears down the
 * idle camera preview and acknowledges a surfaced error. A failure the user
 * barely had time to see (popup closed almost immediately, e.g. Chrome closing
 * it when focus moved) is kept so the next open still shows it.
 */
export const shouldKeepErrorOnPopupClose = (
	status: RecordingStatus,
	openForMs: number,
	minAckMs: number,
) => status.phase === "error" && openForMs < minAckMs;

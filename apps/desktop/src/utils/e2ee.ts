import { confirm } from "@tauri-apps/plugin-dialog";

export const ENCRYPTION_SUMMARY =
	"Recordings are encrypted on this Mac before upload. Only people with the full link can watch.";

export const ENCRYPTION_COSTS =
	"No transcripts or AI titles, no preview image in chat apps, and no download from the browser. Screencap can't recover a recording if you lose this Mac and the link.";

const CONFIRMED_KEY = "screencap-e2ee-confirmed";

export async function confirmTurningOnEncryption() {
	try {
		if (localStorage.getItem(CONFIRMED_KEY) === "1") return true;
	} catch {}
	const confirmed = await confirm(
		`${ENCRYPTION_SUMMARY}\n\n${ENCRYPTION_COSTS}`,
		{ title: "End-to-end encrypt recordings?", okLabel: "Turn on" },
	);
	if (confirmed) {
		try {
			localStorage.setItem(CONFIRMED_KEY, "1");
		} catch {}
	}
	return confirmed;
}

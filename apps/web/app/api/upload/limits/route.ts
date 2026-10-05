import { maxRecordingSeconds } from "@/lib/screencap-limits";

// Public, non-sensitive: lets the browser recorder auto-stop at the configured limit.
export const dynamic = "force-dynamic";

export function GET() {
	return Response.json({ maxRecordingSeconds: maxRecordingSeconds() });
}

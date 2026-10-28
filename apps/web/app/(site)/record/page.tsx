import { getCurrentUser } from "@cap/database/auth/session";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GuestRecordClient } from "./GuestRecordClient";

export const metadata: Metadata = {
	title: "Record your screen",
	description:
		"Record your screen in the browser. Free. No account needed until you want your link.",
};

export const dynamic = "force-dynamic";

export default async function RecordPage() {
	// Server-side, so signed-in users never see the empty guest page flash before the redirect.
	// Safe because the guest recorder never calls router.refresh() on this page (see useWebRecorder).
	if (await getCurrentUser()) redirect("/dashboard/caps/record");
	return <GuestRecordClient />;
}

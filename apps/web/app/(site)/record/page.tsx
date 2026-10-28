import { getCurrentUser } from "@cap/database/auth/session";
import type { Metadata } from "next";
import { GuestRecordClient } from "./GuestRecordClient";

export const metadata: Metadata = {
	title: "Record your screen",
	description:
		"Record your screen in the browser. Free. No account needed until you want your link.",
};

export const dynamic = "force-dynamic";

export default async function RecordPage() {
	const user = await getCurrentUser();
	return <GuestRecordClient signedIn={Boolean(user)} />;
}

import type { Metadata } from "next";
import { RecordVideoPage } from "./RecordVideoPage";

export const metadata: Metadata = {
	title: "New recording",
};

export default function RecordVideoRoute() {
	return <RecordVideoPage />;
}

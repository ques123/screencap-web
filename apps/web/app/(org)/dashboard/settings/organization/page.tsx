import type { Metadata } from "next";
import { GeneralPage } from "./GeneralPage";

export const metadata: Metadata = {
	title: "Organization Settings — Screencap",
};

export default function OrganizationPage() {
	return <GeneralPage />;
}

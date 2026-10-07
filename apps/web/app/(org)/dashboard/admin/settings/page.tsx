import { activeEmailProvider } from "@cap/database/emails/config";
import { getSettings } from "@/lib/screencap-admin";
import { getSettingSourcesForPanel } from "@/lib/screencap-admin/settings";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
	const [settings, sources] = await Promise.all([
		getSettings(),
		getSettingSourcesForPanel(),
	]);
	return (
		<SettingsForm
			settings={settings}
			sources={sources}
			emailProvider={activeEmailProvider()}
		/>
	);
}

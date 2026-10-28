import type { PropsWithChildren } from "react";
import { UploadingProvider } from "@/app/(org)/dashboard/caps/UploadingContext";
import { AppProviders } from "@/app/Layout/AppProviders";

export default function RecordLayout({ children }: PropsWithChildren) {
	return (
		<AppProviders>
			<UploadingProvider>{children}</UploadingProvider>
		</AppProviders>
	);
}

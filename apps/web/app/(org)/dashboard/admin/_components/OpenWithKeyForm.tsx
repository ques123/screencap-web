export function OpenWithKeyForm({
	videoId,
	reportId,
}: {
	videoId: string;
	reportId?: number;
}) {
	return (
		<form
			method="post"
			action="/dashboard/admin/open-key"
			target="_blank"
			className="inline-flex"
			rel="noopener"
		>
			<input type="hidden" name="videoId" value={videoId} />
			{reportId !== undefined && (
				<input type="hidden" name="reportId" value={reportId} />
			)}
			<button
				type="submit"
				className="px-3 h-[32px] text-[13px] font-medium rounded-xl border border-gray-5 bg-gray-1 text-gray-12 hover:bg-gray-3"
			>
				Open with reporter's key
			</button>
		</form>
	);
}

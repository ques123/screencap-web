import Link from "next/link";

export function Pager({
	basePath,
	params,
	page,
	pageSize,
	total,
}: {
	basePath: string;
	params: Record<string, string>;
	page: number;
	pageSize: number;
	total: number;
}) {
	const pages = Math.max(1, Math.ceil(total / pageSize));
	const href = (p: number) => {
		const sp = new URLSearchParams(params);
		if (p > 1) sp.set("page", String(p));
		const qs = sp.toString();
		return qs ? `${basePath}?${qs}` : basePath;
	};
	const linkCls =
		"px-3 py-1.5 text-sm rounded-full border border-gray-4 hover:bg-gray-3 text-gray-12";
	const offCls =
		"px-3 py-1.5 text-sm rounded-full border border-gray-3 text-gray-8";
	return (
		<div className="flex gap-3 justify-between items-center pt-2 text-sm text-gray-11">
			<span>
				{total === 0
					? "Nothing to show"
					: `Page ${page} of ${pages} · ${new Intl.NumberFormat("en-GB").format(total)} total`}
			</span>
			<div className="flex gap-2">
				{page > 1 ? (
					<Link className={linkCls} href={href(page - 1)}>
						Previous
					</Link>
				) : (
					<span className={offCls}>Previous</span>
				)}
				{page < pages ? (
					<Link className={linkCls} href={href(page + 1)}>
						Next
					</Link>
				) : (
					<span className={offCls}>Next</span>
				)}
			</div>
		</div>
	);
}

export function SearchBar({
	action,
	q,
	placeholder,
	hidden,
}: {
	action: string;
	q: string;
	placeholder: string;
	hidden?: Record<string, string>;
}) {
	return (
		<form action={action} method="get" className="flex gap-2">
			{Object.entries(hidden ?? {}).map(([k, v]) => (
				<input key={k} type="hidden" name={k} value={v} />
			))}
			<input
				type="search"
				name="q"
				defaultValue={q}
				placeholder={placeholder}
				className="flex-1 px-4 h-[44px] min-w-0 text-[16px] md:text-[13px] rounded-xl border bg-gray-1 border-gray-4 text-gray-12 placeholder:text-gray-8 outline-0 focus:border-gray-6"
			/>
			<button
				type="submit"
				className="px-5 h-[44px] text-sm font-medium rounded-full border bg-gray-3 border-gray-5 hover:bg-gray-5 text-gray-12"
			>
				Search
			</button>
		</form>
	);
}

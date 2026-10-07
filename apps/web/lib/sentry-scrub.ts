const FRAGMENT = /#[^\s"'<>)]*/g;

export function stripFragment(value: string): string {
	return value.replace(FRAGMENT, "");
}

function stripOptional<T>(value: T): T {
	return (typeof value === "string" ? stripFragment(value) : value) as T;
}

type ScrubbableBreadcrumb = {
	message?: string;
	data?: Record<string, unknown>;
};

type ScrubbableEvent = {
	transaction?: string;
	request?: { url?: string };
	extra?: Record<string, unknown>;
	breadcrumbs?: ScrubbableBreadcrumb[];
};

export function scrubSentryBreadcrumb<T extends ScrubbableBreadcrumb>(
	breadcrumb: T,
): T {
	if (typeof breadcrumb.message === "string")
		breadcrumb.message = stripFragment(breadcrumb.message);
	const data = breadcrumb.data;
	if (data) {
		for (const field of ["url", "from", "to"]) {
			if (typeof data[field] === "string")
				data[field] = stripFragment(data[field] as string);
		}
	}
	return breadcrumb;
}

export function scrubSentryEvent<T extends ScrubbableEvent>(event: T): T {
	if (event.request && typeof event.request.url === "string")
		event.request.url = stripFragment(event.request.url);
	if (typeof event.transaction === "string")
		event.transaction = stripFragment(event.transaction);
	if (event.extra) {
		for (const [name, value] of Object.entries(event.extra))
			event.extra[name] = stripOptional(value);
	}
	if (event.breadcrumbs)
		for (const b of event.breadcrumbs) scrubSentryBreadcrumb(b);
	return event;
}

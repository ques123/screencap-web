import type { SignupSourceFields } from "@cap/database/screencap-sources";
export type ActionInput = {
	adminEmail: string;
	reason?: string;
	source?: "report" | "own";
	notify?: boolean;
};

export type ActionResult =
	| { ok: true; message: string; notified?: boolean }
	| { ok: false; error: string };

export type RemovedState =
	| "removed"
	| "quarantined"
	| "restored"
	| "purging"
	| "purged";

export type AdminLogTargetType = "user" | "recording" | "report" | "settings";

export type AdminLogEntry = {
	id: number;
	at: Date;
	adminEmail: string;
	action: string;
	targetType: AdminLogTargetType;
	targetId: string | null;
	targetLabel: string | null;
	reason: string | null;
	source: string | null;
	notified: boolean;
	details: Record<string, unknown> | null;
};

export type AdminUserRow = {
	id: string;
	email: string;
	name: string | null;
	createdAt: Date;
	recordings: number;
	storedSeconds: number;
	lastActiveAt: Date | null;
	blocked: boolean;
	proRevoked: boolean;
	apps: string[];
	source: SignupSource;
};

export type SignupSourceKind =
	| "ai"
	| "search"
	| "ads"
	| "social"
	| "store"
	| "share"
	| "other"
	| "direct"
	| "untracked";

export type SignupSource = {
	/** "ChatGPT", "Google", "Share link", "Direct", a raw host... */
	label: string;
	kind: SignupSourceKind;
	/** Raw utm_source / referrer host when it adds to the label. */
	detail: string | null;
	/** Stored first-touch fields; null = signed up before tracking (2026-10-27). */
	fields: SignupSourceFields | null;
};

export type RecordedWith = {
	label: string;
	version: string | null;
	detail: string | null;
	inferred: boolean;
};

export type AdminUserClients = {
	installed: {
		label: string;
		version: string | null;
		firstSeenAt: Date | null;
		lastSeenAt: Date | null;
		inferred: boolean;
	}[];
	recordedWith: { label: string; count: number }[];
};

export type AdminRecordingRow = {
	id: string;
	title: string;
	ownerId: string;
	ownerEmail: string | null;
	createdAt: Date;
	durationSeconds: number | null;
	public: boolean;
	views: number;
	openReports: number;
	e2ee: boolean;
	hasReporterKey: boolean;
	recordedWith: RecordedWith;
};

export type AdminUserDetail = AdminUserRow & {
	blockedAt: Date | null;
	blockReason: string | null;
	storageHoursOverride: number | null;
	recordingMinutesOverride: number | null;
	note: string | null;
	recentRecordings: AdminRecordingRow[];
	clients: AdminUserClients;
	/** Limits that apply to this user right now, in the units the overrides use. */
	limits: {
		storageHours: number | null;
		recordingMinutes: number | null;
		storageFromOverride: boolean;
		recordingFromOverride: boolean;
	};
};

export type RemovedRow = {
	videoId: string;
	ownerId: string | null;
	ownerEmail: string | null;
	title: string | null;
	state: RemovedState;
	reason: string | null;
	source: "report" | "own";
	removedBy: string;
	removedAt: Date;
	purgeAfter: Date | null;
	resolvedAt: Date | null;
	/** Whole days until auto purge, or null when never purged. */
	daysLeft: number | null;
};

export type AdminReportRow = {
	id: number;
	videoId: string;
	videoTitle: string | null;
	ownerId: string | null;
	ownerEmail: string | null;
	reason: string;
	details: string | null;
	reporterEmail: string | null;
	country: string;
	status: "open" | "actioned" | "dismissed";
	adminNote: string | null;
	createdAt: Date;
	resolvedAt: Date | null;
	resolvedBy: string | null;
	/** True when the reported recording is currently removed or quarantined. */
	recordingRemoved: boolean;
	e2ee: boolean;
	/** True when this report carries the reporter's decryption key. */
	keyIncluded: boolean;
};

// ── Stats tab (/dashboard/admin/stats) ─────────────────────────────────────────
// Days are Bangkok calendar days (UTC+7), as "YYYY-MM-DD". Internal accounts (admin emails plus the
// internalEmails setting) are left out unless includeInternal: their sign-ups, their recordings, views
// on their recordings, and views they made while signed in.

export type StatsRange = "7d" | "30d" | "90d" | "all";

export type StatsTotals = {
	signups: number;
	recordings: number;
	/** Recordings whose first view by someone other than the owner falls in the period ("shared"). */
	shared: number;
	/** Rows in video_views (page loads; owner views and bots are already left out at write time). */
	views: number;
	/** Distinct video_views.sessionId values (all session-less viewers count as one). */
	viewers: number;
};

export type StatsDay = StatsTotals & { day: string };

export type StatsPlatform =
	| "mac"
	| "browser"
	| "guest"
	| "extension"
	| "upload"
	| "other";

/**
 * Recording in the browser without an account (/record): recording attempts started in the period and
 * how far each got (any time after). leftWithoutSigningUp = stopped but never verified, blocked or
 * uploaded (closed the tab, or downloaded instead).
 */
export type GuestFunnel = {
	started: number;
	stopped: number;
	emailed: number;
	verified: number;
	uploaded: number;
	downloaded: number;
	blocked: number;
	leftWithoutSigningUp: number;
};

export type AdminStats = {
	range: StatsRange;
	includeInternal: boolean;
	/** First and last day shown (inclusive). For "all", `from` is the first sign-up day. */
	from: string;
	to: string;
	totals: StatsTotals;
	/** The same-length period just before `from`; null for "all". */
	previous: StatsTotals | null;
	/** One entry per day from `from` to `to`, zero-filled. */
	daily: StatsDay[];
	/** People who signed up in the period, and how many of them went on (at any time) to each step. */
	funnel: { signedUp: number; recorded: number; shared: number };
	/** Recording without an account (/record), from screencap_guest_events. */
	guest: GuestFunnel;
	/** Day the guest funnel counting began (first screencap_guest_events row), or null. */
	guestSince: string | null;
	/** Recordings made in the period, by where they were made. */
	platforms: Record<StatsPlatform, number>;
	/** Sign-ups in the period by source label (classifySignupSource), biggest first. */
	sources: { label: string; kind: SignupSourceKind; count: number }[];
	/** Per-day sign-up counts for the top 5 source labels, everything else under "Other". */
	sourcesDaily: { day: string; counts: Record<string, number> }[];
	/** How many accounts are being treated as internal (whether or not they are excluded). */
	internalAccounts: number;
	/** Data floors, for the caveat line: first video_views row day, and the day sign-up sources began. */
	viewsSince: string | null;
	sourcesSince: string;
};

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
};

export type AdminUserDetail = AdminUserRow & {
	blockedAt: Date | null;
	blockReason: string | null;
	storageHoursOverride: number | null;
	recordingMinutesOverride: number | null;
	note: string | null;
	recentRecordings: AdminRecordingRow[];
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
};

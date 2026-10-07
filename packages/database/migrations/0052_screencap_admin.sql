CREATE TABLE `screencap_admin_log` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`at` timestamp NOT NULL DEFAULT (now()),
	`adminEmail` varchar(255) NOT NULL,
	`action` varchar(48) NOT NULL,
	`targetType` varchar(16) NOT NULL,
	`targetId` varchar(255),
	`targetLabel` varchar(255),
	`reason` text,
	`source` varchar(16),
	`notified` boolean NOT NULL DEFAULT false,
	`details` json,
	CONSTRAINT `screencap_admin_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `screencap_email_log` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`at` timestamp NOT NULL DEFAULT (now()),
	`provider` varchar(16) NOT NULL,
	`toEmail` varchar(255) NOT NULL,
	`subject` varchar(255) NOT NULL,
	`ok` boolean NOT NULL,
	`error` text,
	CONSTRAINT `screencap_email_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `screencap_removed_videos` (
	`videoId` varchar(15) NOT NULL,
	`ownerId` varchar(15),
	`ownerEmail` varchar(255),
	`title` varchar(255),
	`snapshot` json NOT NULL,
	`state` varchar(16) NOT NULL,
	`reason` text,
	`source` varchar(16) NOT NULL DEFAULT 'own',
	`removedBy` varchar(255) NOT NULL,
	`removedAt` timestamp NOT NULL DEFAULT (now()),
	`purgeAfter` timestamp,
	`resolvedAt` timestamp,
	CONSTRAINT `screencap_removed_videos_videoId` PRIMARY KEY(`videoId`)
);
--> statement-breakpoint
CREATE TABLE `screencap_reports` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`videoId` varchar(15) NOT NULL,
	`videoTitle` varchar(255),
	`ownerId` varchar(15),
	`ownerEmail` varchar(255),
	`reason` varchar(64) NOT NULL,
	`details` text,
	`reporterEmail` varchar(255),
	`country` varchar(8) NOT NULL DEFAULT '',
	`status` varchar(16) NOT NULL DEFAULT 'open',
	`adminNote` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	`resolvedBy` varchar(255),
	CONSTRAINT `screencap_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `screencap_settings` (
	`key` varchar(64) NOT NULL,
	`value` json NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updatedBy` varchar(255),
	CONSTRAINT `screencap_settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `screencap_user_admin` (
	`userId` varchar(15) NOT NULL,
	`blockedAt` timestamp,
	`blockReason` text,
	`storageHoursOverride` int,
	`recordingMinutesOverride` int,
	`note` text,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `screencap_user_admin_userId` PRIMARY KEY(`userId`)
);
--> statement-breakpoint
CREATE INDEX `admin_log_at_idx` ON `screencap_admin_log` (`at`);--> statement-breakpoint
CREATE INDEX `email_log_at_idx` ON `screencap_email_log` (`at`);--> statement-breakpoint
CREATE INDEX `state_purge_idx` ON `screencap_removed_videos` (`state`,`purgeAfter`);--> statement-breakpoint
CREATE INDEX `status_created_idx` ON `screencap_reports` (`status`,`created_at`);
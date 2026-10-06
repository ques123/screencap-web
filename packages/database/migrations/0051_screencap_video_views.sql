CREATE TABLE `video_views` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`videoId` varchar(15) NOT NULL,
	`tenantId` varchar(255) NOT NULL,
	`ownerId` varchar(15),
	`sessionId` varchar(128) NOT NULL,
	`viewerUserId` varchar(15),
	`country` varchar(8) NOT NULL DEFAULT '',
	`region` varchar(128) NOT NULL DEFAULT '',
	`city` varchar(128) NOT NULL DEFAULT '',
	`browser` varchar(64) NOT NULL DEFAULT '',
	`os` varchar(64) NOT NULL DEFAULT '',
	`device` varchar(32) NOT NULL DEFAULT '',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `video_views_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `video_created_idx` ON `video_views` (`videoId`,`created_at`);--> statement-breakpoint
CREATE INDEX `tenant_created_idx` ON `video_views` (`tenantId`,`created_at`);
CREATE TABLE `screencap_tool_events` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`tool` varchar(32) NOT NULL,
	`step` varchar(24) NOT NULL,
	`visit_id` varchar(36),
	`size_bucket` varchar(16),
	`duration_bucket` varchar(16),
	`output_bucket` varchar(16),
	`error_class` varchar(64),
	`browser` varchar(32),
	`os` varchar(32),
	`country` varchar(2),
	`referrer_host` varchar(128),
	`utm_source` varchar(64),
	CONSTRAINT `screencap_tool_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `tool_events_created_idx` ON `screencap_tool_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `tool_events_tool_created_idx` ON `screencap_tool_events` (`tool`,`created_at`);
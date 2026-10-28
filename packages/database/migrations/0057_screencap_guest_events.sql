CREATE TABLE `screencap_guest_events` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`attempt_id` varchar(36) NOT NULL,
	`event` varchar(24) NOT NULL,
	`user_id` varchar(15),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `screencap_guest_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `guest_event_created_idx` ON `screencap_guest_events` (`event`,`created_at`);--> statement-breakpoint
CREATE INDEX `guest_attempt_idx` ON `screencap_guest_events` (`attempt_id`);
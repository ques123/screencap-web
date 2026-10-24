CREATE TABLE `screencap_user_clients` (
	`user_id` varchar(15) NOT NULL,
	`client` varchar(24) NOT NULL,
	`version` varchar(32) NOT NULL DEFAULT '',
	`first_seen_at` timestamp NOT NULL DEFAULT (now()),
	`last_seen_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `screencap_user_clients_user_id_client_version_pk` PRIMARY KEY(`user_id`,`client`,`version`)
);
--> statement-breakpoint
CREATE TABLE `screencap_video_clients` (
	`video_id` varchar(15) NOT NULL,
	`client` varchar(24) NOT NULL,
	`version` varchar(32),
	`detail` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `screencap_video_clients_video_id` PRIMARY KEY(`video_id`)
);

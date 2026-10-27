CREATE TABLE `screencap_user_sources` (
	`user_id` varchar(15) NOT NULL,
	`referrer_host` varchar(255),
	`utm_source` varchar(100),
	`utm_medium` varchar(100),
	`utm_campaign` varchar(100),
	`landing_path` varchar(255),
	`first_seen_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `screencap_user_sources_user_id` PRIMARY KEY(`user_id`)
);

CREATE TABLE `user_ai_settings` (
	`userId` varchar(15) NOT NULL,
	`openRouterKey` text,
	`openRouterKeyLabel` varchar(64),
	`transcriptionModel` varchar(128),
	`summaryModel` varchar(128),
	`zeroDataRetention` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_ai_settings_userId` PRIMARY KEY(`userId`)
);

ALTER TABLE `screencap_reports` ADD `decryptionKey` text;--> statement-breakpoint
ALTER TABLE `videos` ADD `e2ee` tinyint;--> statement-breakpoint
ALTER TABLE `videos` ADD `keyFingerprint` varchar(32);
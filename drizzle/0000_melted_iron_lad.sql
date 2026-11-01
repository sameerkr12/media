CREATE TABLE `admins` (
	`user_id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clicks` (
	`id` text PRIMARY KEY NOT NULL,
	`link_id` text NOT NULL,
	`visitor` text NOT NULL,
	`country` text NOT NULL,
	`device` text NOT NULL,
	`referrer` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`link_id`) REFERENCES `links`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `click_link_date` ON `clicks` (`link_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `click_visitor` ON `clicks` (`link_id`,`visitor`);--> statement-breakpoint
CREATE TABLE `creators` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`handle` text NOT NULL,
	`email` text,
	`user_id` text,
	`bio` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `creator_email` ON `creators` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `creator_user` ON `creators` (`user_id`);--> statement-breakpoint
CREATE TABLE `links` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`brand` text NOT NULL,
	`creator_id` text NOT NULL,
	`destination` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`expires_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `creators`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `link_slug` ON `links` (`slug`);--> statement-breakpoint
CREATE INDEX `link_creator` ON `links` (`creator_id`);
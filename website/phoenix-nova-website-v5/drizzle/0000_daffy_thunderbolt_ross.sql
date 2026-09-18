CREATE TABLE `core_auth_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `core_auth_audit_actor_idx` ON `core_auth_audit` (`actor_user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `core_auth_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `core_auth_limit_expiry_idx` ON `core_auth_limits` (`expires_at`);--> statement-breakpoint
CREATE TABLE `core_auth_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `core_auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `core_auth_session_user_idx` ON `core_auth_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `core_auth_session_expiry_idx` ON `core_auth_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `core_auth_users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`recovery_hash` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `core_auth_username_unique` ON `core_auth_users` (`username`);
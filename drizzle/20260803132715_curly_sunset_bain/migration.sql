CREATE TABLE `chat_rooms` (
	`id` text PRIMARY KEY,
	`sessionId` text NOT NULL,
	`title` text,
	`status` text DEFAULT 'active' NOT NULL,
	`agent` text DEFAULT 'kai' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chats` (
	`id` text PRIMARY KEY,
	`chatRoomId` text NOT NULL,
	`clientMessage` text NOT NULL,
	`agentResponse` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`errorMessage` text,
	`sequence` integer DEFAULT 1 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_chats_chatRoomId_chat_rooms_id_fk` FOREIGN KEY (`chatRoomId`) REFERENCES `chat_rooms`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `chat_rooms_session_id_idx` ON `chat_rooms` (`sessionId`);--> statement-breakpoint
CREATE INDEX `chats_chat_room_id_idx` ON `chats` (`chatRoomId`);--> statement-breakpoint
CREATE INDEX `chats_room_sequence_idx` ON `chats` (`chatRoomId`,`sequence`);
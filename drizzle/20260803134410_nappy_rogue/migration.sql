PRAGMA foreign_keys=OFF;
--> statement-breakpoint
DROP TABLE IF EXISTS `chats`;
--> statement-breakpoint
CREATE TABLE `chats` (
	`id` text PRIMARY KEY,
	`chatRoomId` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`errorMessage` text,
	`sequence` integer NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT `fk_chats_chatRoomId_chat_rooms_id_fk` FOREIGN KEY (`chatRoomId`) REFERENCES `chat_rooms`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `chats_chat_room_id_idx` ON `chats` (`chatRoomId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `chats_room_sequence_uidx` ON `chats` (`chatRoomId`,`sequence`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;

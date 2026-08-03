DROP INDEX IF EXISTS `chat_rooms_session_id_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `chat_rooms_session_id_uidx` ON `chat_rooms` (`sessionId`);
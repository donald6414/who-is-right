ALTER TABLE `chat_rooms` ADD `channel` text DEFAULT 'web' NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_rooms` ADD `callSid` text;--> statement-breakpoint
ALTER TABLE `chat_rooms` ADD `accountSid` text;--> statement-breakpoint
ALTER TABLE `chat_rooms` ADD `twilioSessionId` text;--> statement-breakpoint
ALTER TABLE `chat_rooms` ADD `parentCallSid` text;--> statement-breakpoint
ALTER TABLE `chat_rooms` ADD `fromPhone` text;--> statement-breakpoint
ALTER TABLE `chat_rooms` ADD `toPhone` text;--> statement-breakpoint
ALTER TABLE `chat_rooms` ADD `forwardedFrom` text;--> statement-breakpoint
ALTER TABLE `chat_rooms` ADD `callerName` text;--> statement-breakpoint
ALTER TABLE `chat_rooms` ADD `direction` text;--> statement-breakpoint
ALTER TABLE `chat_rooms` ADD `callStatus` text;--> statement-breakpoint
ALTER TABLE `chat_rooms` ADD `callType` text;--> statement-breakpoint
ALTER TABLE `chats` ADD `lang` text;--> statement-breakpoint
ALTER TABLE `chats` ADD `callSid` text;--> statement-breakpoint
CREATE INDEX `chat_rooms_call_sid_idx` ON `chat_rooms` (`callSid`);--> statement-breakpoint
CREATE INDEX `chat_rooms_from_phone_idx` ON `chat_rooms` (`fromPhone`);--> statement-breakpoint
CREATE INDEX `chats_call_sid_idx` ON `chats` (`callSid`);
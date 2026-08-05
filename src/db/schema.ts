import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * A conversation thread for Kai/Aava (web chat or Twilio voice session).
 */
export const chatRooms = sqliteTable(
	"chat_rooms",
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		/** Client/browser session or Twilio CallSid that owns this room. */
		sessionId: text().notNull(),
		/** Short label for the dispute, e.g. "Messi vs Ronaldo". */
		title: text(),
		/** Conversation lifecycle. */
		status: text({ enum: ["active", "archived", "closed"] })
			.notNull()
			.default("active"),
		/** Which agent is handling this room (kai = web judge, aava = voice clerk). */
		agent: text().notNull().default("kai"),
		/** How the caller reached court: web UI or Twilio voice. */
		channel: text({ enum: ["web", "voice"] }).notNull().default("web"),
		/** Twilio ConversationRelay / Voice fields (null for web chats). */
		callSid: text(),
		accountSid: text(),
		twilioSessionId: text(),
		parentCallSid: text(),
		fromPhone: text(),
		toPhone: text(),
		forwardedFrom: text(),
		callerName: text(),
		direction: text(),
		callStatus: text(),
		callType: text(),
		createdAt: integer({ mode: "timestamp_ms" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
		updatedAt: integer({ mode: "timestamp_ms" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`)
			.$onUpdateFn(() => new Date()),
	},
	(table) => [
		uniqueIndex("chat_rooms_session_id_uidx").on(table.sessionId),
		index("chat_rooms_call_sid_idx").on(table.callSid),
		index("chat_rooms_from_phone_idx").on(table.fromPhone),
	],
);

/**
 * One stored message in a chat room (user or assistant).
 * Every conversational line is its own row so the full transcript is explicit.
 */
export const chats = sqliteTable(
	"chats",
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		chatRoomId: text()
			.notNull()
			.references(() => chatRooms.id, { onDelete: "cascade" }),
		/** Who sent this message. */
		role: text({ enum: ["user", "assistant"] }).notNull(),
		/** Full message text. */
		content: text().notNull(),
		/**
		 * Message state:
		 * - pending: waiting on the model (rare for stored rows)
		 * - completed: successfully stored reply / user message
		 * - needs_clarification: Kai asked for more details
		 * - error: assistant turn failed
		 */
		status: text({
			enum: ["pending", "completed", "needs_clarification", "error"],
		})
			.notNull()
			.default("completed"),
		/** Optional error detail when status is "error". */
		errorMessage: text(),
		/** Absolute order within the room (1, 2, 3…). */
		sequence: integer().notNull(),
		/** Speech / UI language hint from ConversationRelay (e.g. en-US). */
		lang: text(),
		/** Denormalized CallSid for voice-message lookups. */
		callSid: text(),
		createdAt: integer({ mode: "timestamp_ms" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
		updatedAt: integer({ mode: "timestamp_ms" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`)
			.$onUpdateFn(() => new Date()),
	},
	(table) => [
		index("chats_chat_room_id_idx").on(table.chatRoomId),
		uniqueIndex("chats_room_sequence_uidx").on(table.chatRoomId, table.sequence),
		index("chats_call_sid_idx").on(table.callSid),
	],
);

export type ChatRoom = typeof chatRooms.$inferSelect;
export type NewChatRoom = typeof chatRooms.$inferInsert;
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;

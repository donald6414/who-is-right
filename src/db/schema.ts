import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * A conversation thread for Kai (one dispute session).
 */
export const chatRooms = sqliteTable(
	"chat_rooms",
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		/** Client/browser session that owns this room. */
		sessionId: text().notNull(),
		/** Short label for the dispute, e.g. "Messi vs Ronaldo". */
		title: text(),
		/** Conversation lifecycle. */
		status: text({ enum: ["active", "archived", "closed"] })
			.notNull()
			.default("active"),
		/** Which agent is handling this room. */
		agent: text().notNull().default("kai"),
		createdAt: integer({ mode: "timestamp_ms" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`),
		updatedAt: integer({ mode: "timestamp_ms" })
			.notNull()
			.default(sql`(unixepoch() * 1000)`)
			.$onUpdateFn(() => new Date()),
	},
	(table) => [uniqueIndex("chat_rooms_session_id_uidx").on(table.sessionId)],
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
	],
);

export type ChatRoom = typeof chatRooms.$inferSelect;
export type NewChatRoom = typeof chatRooms.$inferInsert;
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;

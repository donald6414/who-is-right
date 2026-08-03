import { type Db, chatRooms, chats } from "../../db";

/**
 * Load a chat room and every stored message for a session.
 * Creates the room on first visit (empty messages).
 * Messages are returned newest-first for the API, but keep sequence intact.
 */
export async function getConversationsBySessionId(
	db: Db,
	sessionId: string,
) {
	const existing = await db.query.chatRooms.findFirst({
		where: { sessionId },
		with: {
			chats: {
				orderBy: { sequence: "desc" },
			},
		},
	});

	if (existing) {
		return existing;
	}

	const [created] = await db
		.insert(chatRooms)
		.values({ sessionId })
		.returning();

	if (!created) {
		throw new Error("Failed to create chat room");
	}

	return {
		...created,
		chats: [] as (typeof chats.$inferSelect)[],
	};
}

/**
 * Ensure a chat room exists for the session and return it (without chats).
 */
export async function getOrCreateChatRoom(db: Db, sessionId: string) {
	const existing = await db.query.chatRooms.findFirst({
		where: { sessionId },
	});

	if (existing) {
		return existing;
	}

	const [created] = await db
		.insert(chatRooms)
		.values({ sessionId })
		.returning();

	if (!created) {
		throw new Error("Failed to create chat room");
	}

	return created;
}

/**
 * Next sequence number for a room's messages.
 */
export async function getNextChatSequence(db: Db, chatRoomId: string) {
	const roomChats = await db.query.chats.findMany({
		where: { chatRoomId },
		columns: { sequence: true },
		orderBy: { sequence: "desc" },
		limit: 1,
	});

	return (roomChats[0]?.sequence ?? 0) + 1;
}

/**
 * Chronological transcript (oldest → newest) for model context / display.
 */
export function toChronologicalMessages<
	T extends { sequence: number },
>(messages: T[]) {
	return [...messages].sort((a, b) => a.sequence - b.sequence);
}

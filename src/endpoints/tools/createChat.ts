import { eq } from "drizzle-orm";
import { type Chat, type Db, chatRooms, chats } from "../../db";
import {
	getNextChatSequence,
	getOrCreateChatRoom,
} from "./getConversationsBySessionId";

export type CreateChatInput = {
	sessionId: string;
	clientMessage: string;
	agentResponse: string | null;
	status?: Chat["status"];
	errorMessage?: string | null;
	/** Optional title set on first message if the room has none. */
	title?: string;
};

/**
 * Persist a full turn as two clear rows:
 * 1) user message
 * 2) assistant message (or an error placeholder if Kai failed)
 */
export async function createChat(db: Db, input: CreateChatInput) {
	const room = await getOrCreateChatRoom(db, input.sessionId);
	const userSequence = await getNextChatSequence(db, room.id);
	const assistantSequence = userSequence + 1;
	const assistantStatus = input.status ?? "completed";
	const assistantContent =
		input.agentResponse?.trim() ||
		(assistantStatus === "error"
			? `[error] ${input.errorMessage ?? "Kai failed to respond"}`
			: "");

	if (!assistantContent) {
		throw new Error("Cannot store an empty assistant response");
	}

	const inserted = await db
		.insert(chats)
		.values([
			{
				chatRoomId: room.id,
				role: "user",
				content: input.clientMessage,
				status: "completed",
				errorMessage: null,
				sequence: userSequence,
			},
			{
				chatRoomId: room.id,
				role: "assistant",
				content: assistantContent,
				status: assistantStatus,
				errorMessage: input.errorMessage ?? null,
				sequence: assistantSequence,
			},
		])
		.returning();

	const userMessage = inserted.find((row) => row.role === "user");
	const assistantMessage = inserted.find((row) => row.role === "assistant");

	if (!userMessage || !assistantMessage) {
		throw new Error("Failed to create chat messages");
	}

	const roomPatch: { updatedAt: Date; title?: string } = {
		updatedAt: new Date(),
	};

	if (input.title && !room.title) {
		roomPatch.title = input.title;
	}

	await db.update(chatRooms).set(roomPatch).where(eq(chatRooms.id, room.id));

	return {
		userMessage,
		assistantMessage,
		messages: [userMessage, assistantMessage],
		chatRoomId: room.id,
		sessionId: input.sessionId,
	};
}

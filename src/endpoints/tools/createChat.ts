import { eq } from "drizzle-orm";
import { type Chat, type Db, chatRooms, chats } from "../../db";
import {
	getNextChatSequence,
	getOrCreateChatRoom,
	type ChatRoomMeta,
} from "./getConversationsBySessionId";

export type CreateChatInput = {
	sessionId: string;
	clientMessage: string;
	agentResponse: string | null;
	status?: Chat["status"];
	errorMessage?: string | null;
	/** Optional title set on first message if the room has none. */
	title?: string;
	/** Optional room metadata (Twilio / channel / agent). */
	roomMeta?: ChatRoomMeta;
	/** Speech language from ConversationRelay prompt. */
	lang?: string | null;
	/** Denormalized CallSid on each message row. */
	callSid?: string | null;
};

/**
 * Persist a full turn as two clear rows:
 * 1) user message
 * 2) assistant message (or an error placeholder if the agent failed)
 */
export async function createChat(db: Db, input: CreateChatInput) {
	const room = await getOrCreateChatRoom(db, input.sessionId, input.roomMeta);
	const userSequence = await getNextChatSequence(db, room.id);
	const assistantSequence = userSequence + 1;
	const assistantStatus = input.status ?? "completed";
	const assistantContent =
		input.agentResponse?.trim() ||
		(assistantStatus === "error"
			? `[error] ${input.errorMessage ?? "Agent failed to respond"}`
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
				lang: input.lang ?? null,
				callSid: input.callSid ?? room.callSid ?? null,
			},
			{
				chatRoomId: room.id,
				role: "assistant",
				content: assistantContent,
				status: assistantStatus,
				errorMessage: input.errorMessage ?? null,
				sequence: assistantSequence,
				lang: input.lang ?? null,
				callSid: input.callSid ?? room.callSid ?? null,
			},
		])
		.returning();

	const userMessage = inserted.find((row) => row.role === "user");
	const assistantMessage = inserted.find((row) => row.role === "assistant");

	if (!userMessage || !assistantMessage) {
		throw new Error("Failed to create chat messages");
	}

	const roomPatch: {
		updatedAt: Date;
		title?: string;
		agent?: string;
		channel?: "web" | "voice";
	} = {
		updatedAt: new Date(),
	};

	if (input.title && !room.title) {
		roomPatch.title = input.title;
	}
	if (input.roomMeta?.agent && room.agent !== input.roomMeta.agent) {
		roomPatch.agent = input.roomMeta.agent;
	}
	if (input.roomMeta?.channel && room.channel !== input.roomMeta.channel) {
		roomPatch.channel = input.roomMeta.channel;
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

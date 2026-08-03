import { createDb } from "../../../db";
import {
	getConversationsBySessionId,
	toChronologicalMessages,
} from "../../tools/getConversationsBySessionId";
import type { AppContext } from "../../../types";
import { SESSION_ID_HEADER } from "../middleware/sessionId";

/**
 * First touch / resume: ensure a chat room exists for the session and
 * return the room with the full message transcript.
 */
export async function kaiGet(c: AppContext) {
	const sessionId = c.get("sessionId");
	const db = createDb(c.env.DB);

	const conversation = await getConversationsBySessionId(db, sessionId);
	const chronological = toChronologicalMessages(conversation.chats);

	c.header(SESSION_ID_HEADER, sessionId);

	return c.json({
		sessionId,
		chatRoom: {
			id: conversation.id,
			sessionId: conversation.sessionId,
			title: conversation.title,
			status: conversation.status,
			agent: conversation.agent,
			createdAt: conversation.createdAt,
			updatedAt: conversation.updatedAt,
		},
		/** Newest first (API convenience). */
		chats: conversation.chats,
		/** Full clear transcript, oldest → newest. */
		messages: chronological.map((msg) => ({
			id: msg.id,
			role: msg.role,
			content: msg.content,
			status: msg.status,
			errorMessage: msg.errorMessage,
			sequence: msg.sequence,
			createdAt: msg.createdAt,
			updatedAt: msg.updatedAt,
		})),
		messageCount: chronological.length,
	});
}

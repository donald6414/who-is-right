import { createDb } from "../../../db";
import { kaiDisputePrompt } from "../../prompts/kaiDispute";
import { createChat } from "../../tools/createChat";
import {
	getConversationsBySessionId,
	toChronologicalMessages,
} from "../../tools/getConversationsBySessionId";
import type { AppContext } from "../../../types";
import { SESSION_ID_HEADER } from "../middleware/sessionId";

type ChatMessage = {
	role: "system" | "user" | "assistant";
	content: string;
};

type OpenAiChatCompletion = {
	choices?: Array<{
		message?: { content?: string | null };
	}>;
	error?: { message?: string };
};

/**
 * Send a dispute to Kai (OpenAI), persist both sides of the turn, and return the reply.
 */
export async function kaiPost(c: AppContext) {
	const sessionId = c.get("sessionId");
	const body = await c.req.json().catch(() => ({} as Record<string, unknown>));
	const clientMessage =
		typeof body.message === "string"
			? body.message
			: typeof body.clientMessage === "string"
				? body.clientMessage
				: "";

	if (!clientMessage.trim()) {
		return c.json({ error: "message is required", sessionId }, 400);
	}

	const apiKey = c.env.OPEN_AI_SECRET_KEY;
	if (!apiKey) {
		return c.json({ error: "OpenAI secret key is not configured", sessionId }, 500);
	}

	const db = createDb(c.env.DB);
	const conversation = await getConversationsBySessionId(db, sessionId);
	const messages = buildOpenAiMessages(conversation.chats, clientMessage);

	let agentResponse: string | null = null;
	let status: "completed" | "needs_clarification" | "error" = "completed";
	let errorMessage: string | null = null;

	try {
		const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: "gpt-4o-mini",
				messages,
				temperature: 0.8,
			}),
		});

		const data = (await openaiRes.json()) as OpenAiChatCompletion;

		if (!openaiRes.ok) {
			status = "error";
			errorMessage = data.error?.message ?? `OpenAI error (${openaiRes.status})`;
		} else {
			agentResponse = data.choices?.[0]?.message?.content?.trim() || null;
			if (!agentResponse) {
				status = "error";
				errorMessage = "OpenAI returned an empty response";
			} else if (looksLikeClarification(agentResponse)) {
				status = "needs_clarification";
			}
		}
	} catch (err) {
		status = "error";
		errorMessage = err instanceof Error ? err.message : "Failed to reach OpenAI";
	}

	const title = !conversation.title ? clientMessage.slice(0, 80) : undefined;

	const saved = await createChat(db, {
		sessionId,
		clientMessage,
		agentResponse,
		status,
		errorMessage,
		title,
	});

	c.header(SESSION_ID_HEADER, sessionId);

	if (status === "error") {
		return c.json(
			{
				sessionId,
				error: errorMessage,
				messages: saved.messages,
			},
			502,
		);
	}

	return c.json({
		sessionId,
		chatRoomId: saved.chatRoomId,
		messages: saved.messages,
		userMessage: saved.userMessage,
		assistantMessage: saved.assistantMessage,
		agentResponse,
		contextMessages: Math.max(0, messages.length - 2),
	});
}

/**
 * Builds the OpenAI messages array with the full stored transcript:
 * system prompt → every prior user/assistant message → new user message.
 */
function buildOpenAiMessages(
	stored: Array<{
		sequence: number;
		role: "user" | "assistant";
		content: string;
		status: string;
	}>,
	clientMessage: string,
): ChatMessage[] {
	const prior = toChronologicalMessages(stored).flatMap((msg): ChatMessage[] => {
		if (msg.status === "error") {
			return [];
		}
		return [{ role: msg.role, content: msg.content }];
	});

	return [
		{ role: "system", content: kaiDisputePrompt },
		...prior,
		{ role: "user", content: clientMessage },
	];
}

function looksLikeClarification(text: string) {
	const lower = text.toLowerCase();
	return (
		lower.includes("need more") ||
		lower.includes("more details") ||
		lower.includes("tell me more") ||
		lower.includes("who are the people") ||
		(lower.includes("?") &&
			(lower.includes("clarify") ||
				lower.includes("which") ||
				lower.includes("what exactly")))
	);
}

import { createDb, type Db } from "../../../../db";
import { createChat } from "../../../tools/createChat";
import {
	getConversationsBySessionId,
	toChronologicalMessages,
	type ChatRoomMeta,
} from "../../../tools/getConversationsBySessionId";
import { aavaCourtPrompt } from "../prompt/aavaCourt";
import type { AavaCallSession } from "../types";

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

export type AavaReplyInput = {
	/** Cloudflare env (D1 + OpenAI secret). */
	env: Env;
	/** Live Twilio call context from the setup message. */
	call: AavaCallSession;
	/** Caller's spoken text (ConversationRelay voicePrompt). */
	clientMessage: string;
	/** Speech language, e.g. en-US. */
	lang?: string;
};

export type AavaReplyResult = {
	sessionId: string;
	chatRoomId: string;
	agentResponse: string | null;
	status: "completed" | "needs_clarification" | "error";
	errorMessage: string | null;
};

/**
 * Same flow as kaiPost, but for Aava on voice:
 * load transcript → OpenAI with aavaCourtPrompt → persist via createChat → return reply.
 */
export async function createAavaReply(
	input: AavaReplyInput,
): Promise<AavaReplyResult> {
	const { env, call, clientMessage, lang } = input;
	// Voice rooms are keyed by CallSid so each phone call is its own case file.
	const sessionId = call.callSid;

	console.log("[aava] createAavaReply start", {
		sessionId,
		fromPhone: call.fromPhone,
		toPhone: call.toPhone,
		messagePreview: clientMessage.slice(0, 80),
		lang,
	});

	const apiKey = env.OPEN_AI_SECRET_KEY;
	if (!apiKey) {
		console.log("[aava] missing OPEN_AI_SECRET_KEY");
		return {
			sessionId,
			chatRoomId: "",
			agentResponse: null,
			status: "error",
			errorMessage: "OpenAI secret key is not configured",
		};
	}

	const db = createDb(env.DB);
	const roomMeta = toRoomMeta(call);

	// Ensure the voice room exists and is stamped with Twilio phone metadata.
	const conversation = await getConversationsBySessionId(db, sessionId, roomMeta);
	console.log("[aava] loaded conversation", {
		chatRoomId: conversation.id,
		priorMessages: conversation.chats.length,
		agent: conversation.agent,
		channel: conversation.channel,
	});

	const messages = buildOpenAiMessages(conversation.chats, clientMessage);
	console.log("[aava] openai message count", messages.length);

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
		console.log("[aava] openai status", openaiRes.status);

		if (!openaiRes.ok) {
			status = "error";
			errorMessage = data.error?.message ?? `OpenAI error (${openaiRes.status})`;
			console.log("[aava] openai error body", errorMessage);
		} else {
			agentResponse = data.choices?.[0]?.message?.content?.trim() || null;
			if (!agentResponse) {
				status = "error";
				errorMessage = "OpenAI returned an empty response";
				console.log("[aava] empty openai content");
			} else if (looksLikeClarification(agentResponse)) {
				status = "needs_clarification";
				console.log("[aava] reply needs clarification");
			} else {
				console.log("[aava] reply ok", agentResponse.slice(0, 120));
			}
		}
	} catch (err) {
		status = "error";
		errorMessage = err instanceof Error ? err.message : "Failed to reach OpenAI";
		console.log("[aava] openai fetch threw", errorMessage);
	}

	const title = !conversation.title ? clientMessage.slice(0, 80) : undefined;

	const saved = await persistTurn(db, {
		sessionId,
		clientMessage,
		agentResponse,
		status,
		errorMessage,
		title,
		roomMeta,
		lang,
		callSid: call.callSid,
	});

	console.log("[aava] persisted turn", {
		chatRoomId: saved.chatRoomId,
		status,
	});

	return {
		sessionId,
		chatRoomId: saved.chatRoomId,
		agentResponse,
		status,
		errorMessage,
	};
}

/**
 * Persist user + assistant rows; never throw past the websocket (return error status instead).
 */
async function persistTurn(
	db: Db,
	input: Parameters<typeof createChat>[1],
) {
	try {
		return await createChat(db, input);
	} catch (err) {
		const message = err instanceof Error ? err.message : "Failed to persist chat";
		console.log("[aava] createChat failed", message);
		return {
			chatRoomId: "",
			sessionId: input.sessionId,
			userMessage: null,
			assistantMessage: null,
			messages: [],
		};
	}
}

/** Map Twilio setup fields onto chat_rooms columns. */
function toRoomMeta(call: AavaCallSession): ChatRoomMeta {
	return {
		agent: "aava",
		channel: "voice",
		callSid: call.callSid,
		accountSid: call.accountSid,
		twilioSessionId: call.twilioSessionId,
		parentCallSid: call.parentCallSid || null,
		fromPhone: call.fromPhone,
		toPhone: call.toPhone,
		forwardedFrom: call.forwardedFrom || null,
		callerName: call.callerName || null,
		direction: call.direction || null,
		callStatus: call.callStatus || null,
		callType: call.callType || null,
	};
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
		{ role: "system", content: aavaCourtPrompt },
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
		lower.includes("court needs ids") ||
		(lower.includes("?") &&
			(lower.includes("clarify") ||
				lower.includes("which") ||
				lower.includes("what exactly") ||
				lower.includes("who is the wife") ||
				lower.includes("girlfriend")))
	);
}

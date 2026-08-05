import { Hono } from "hono";
import { upgradeWebSocket } from "hono/cloudflare-workers";
import type { WSContext } from "hono/ws";
import { createAavaReply } from "./functions/aavaReply";
import type {
	AavaCallSession,
	TwilioIncomingMessage,
	TwilioPromptMessage,
	TwilioSetupMessage,
	TwilioTextTokenMessage,
} from "./types";

const websocket = new Hono<{ Bindings: Env }>();

/**
 * Cloudflare Workers has no WebSocket onOpen event.
 * This runs when the HTTP request upgrades to a WebSocket (accept time).
 */
function onOpen() {
	console.log("✅ [ws] Twilio ConversationRelay connected (upgrade accepted)");
}

/**
 * Send a ConversationRelay "text" token so Twilio can speak it to the caller.
 * last:true means this is the full utterance for this talk turn.
 */
function sendTextToken(ws: WSContext, token: string, last = true) {
	const payload: TwilioTextTokenMessage = {
		type: "text",
		token,
		last,
		interruptible: true,
	};
	console.log("[ws] → Twilio text token", {
		last,
		preview: token.slice(0, 120),
		length: token.length,
	});
	ws.send(JSON.stringify(payload));
}

/**
 * Parse raw WebSocket data from Twilio into a typed JSON message.
 * Twilio always sends JSON strings for ConversationRelay.
 */
function parseIncoming(data: string | ArrayBuffer): TwilioIncomingMessage | null {
	try {
		const text = typeof data === "string" ? data : new TextDecoder().decode(data);
		console.log("[ws] ← raw frame", text.slice(0, 500));
		return JSON.parse(text) as TwilioIncomingMessage;
	} catch (err) {
		console.log(
			"[ws] failed to parse incoming frame",
			err instanceof Error ? err.message : err,
		);
		return null;
	}
}

/**
 * Store Twilio setup fields on the in-memory call session for this socket.
 * CallSid becomes our D1 chat room sessionId.
 */
function buildCallSession(setup: TwilioSetupMessage): AavaCallSession {
	const call: AavaCallSession = {
		callSid: setup.callSid,
		accountSid: setup.accountSid,
		twilioSessionId: setup.sessionId,
		fromPhone: setup.from,
		toPhone: setup.to,
		direction: setup.direction ?? "",
		callStatus: setup.callStatus ?? "",
		callType: setup.callType ?? "",
		callerName: setup.callerName ?? "",
		forwardedFrom: setup.forwardedFrom ?? "",
		parentCallSid: setup.parentCallSid ?? "",
	};
	console.log("[ws] setup → call session", call);
	return call;
}

/**
 * Handle a final (or sole) speech prompt: call Aava/OpenAI, persist, speak back.
 */
async function handlePrompt(
	env: Env,
	ws: WSContext,
	call: AavaCallSession | null,
	prompt: TwilioPromptMessage,
) {
	console.log("[ws] prompt received", {
		last: prompt.last,
		lang: prompt.lang,
		voicePrompt: prompt.voicePrompt,
	});

	// Partial transcripts (last:false) are ignored until speech is final.
	if (prompt.last === false) {
		console.log("[ws] ignoring partial prompt (waiting for last:true)");
		return;
	}

	if (!call?.callSid) {
		console.log("[ws] prompt before setup — no CallSid yet");
		sendTextToken(
			ws,
			"One moment please. The court is still opening your case file.",
			true,
		);
		return;
	}

	const result = await createAavaReply({
		env,
		call,
		clientMessage: prompt.voicePrompt,
		lang: prompt.lang,
	});

	console.log("[ws] aava result", {
		status: result.status,
		chatRoomId: result.chatRoomId,
		hasReply: Boolean(result.agentResponse),
		errorMessage: result.errorMessage,
	});

	if (result.agentResponse) {
		sendTextToken(ws, result.agentResponse, true);
		return;
	}

	sendTextToken(
		ws,
		"Sorry, the court hit a snag. Please say that again.",
		true,
	);
}

websocket.get(
	"/",
	upgradeWebSocket((c) => {
		// Capture Worker bindings for async onMessage (OpenAI + D1).
		const env = c.env;

		// Per-connection Twilio call metadata (filled on "setup").
		let call: AavaCallSession | null = null;

		// CF equivalent of onOpen — fires when the upgrade handler runs.
		onOpen();

		return {
			/**
			 * Every ConversationRelay JSON frame lands here.
			 */
			async onMessage(event, ws) {
				const message = parseIncoming(event.data);
				if (!message?.type) {
					console.log("[ws] empty or invalid message — skip");
					return;
				}

				console.log("[ws] message type", message.type);

				switch (message.type) {
					case "setup": {
						// First message after connect: phones, CallSid, account, etc.
						call = buildCallSession(message as TwilioSetupMessage);
						console.log("[ws] court session opened for", call.callSid);
						break;
					}

					case "prompt": {
						// Caller finished (or streamed) a spoken utterance.
						await handlePrompt(env, ws, call, message as TwilioPromptMessage);
						break;
					}

					case "dtmf": {
						// Keypad press — log for now; not used in dispute flow yet.
						console.log("[ws] dtmf digit", (message as { digit?: string }).digit);
						break;
					}

					case "interrupt": {
						// Caller talked over TTS — stop treating prior reply as current.
						console.log("[ws] interrupt", message);
						break;
					}

					case "error": {
						// Twilio reported a ConversationRelay error on their side.
						console.log("[ws] twilio error", message);
						break;
					}

					default: {
						console.log("[ws] unhandled message type", message.type, message);
						break;
					}
				}
			},

			onClose(event) {
				console.log("❌ [ws] WebSocket closed", {
					callSid: call?.callSid,
					code: event.code,
					reason: event.reason,
					wasClean: event.wasClean,
				});
			},

			onError(event) {
				console.log("⚠️ [ws] WebSocket error", {
					callSid: call?.callSid,
					event,
				});
			},
		};
	}),
);

export default websocket;

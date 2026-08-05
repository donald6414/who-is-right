import { Context } from "hono";
import {
	extractTwilioIncomingCallBody,
	extractTwilioIncomingCallHeaders,
} from "../types";

export const connect = async (c: Context<{ Bindings: Env }>) => {
	const rawBody = await c.req.parseBody();
	const requestHeaders = extractTwilioIncomingCallHeaders(c.req.raw.headers);
	const requestBody = extractTwilioIncomingCallBody(
		rawBody as Record<string, unknown>,
	);

	console.log("twilio incoming-call headers", requestHeaders);
	console.log("twilio incoming-call body", requestBody);

	// TwiML must start at column 0 — no leading newline/spaces before <?xml
	// or Twilio returns error 12100 (Document parse failure).
	// Google Journey-F = warm en-US female TTS voice for Aava.
	const twiml =
		`<?xml version="1.0" encoding="UTF-8"?>` +
		`<Response>` +
		`<Connect>` +
		`<ConversationRelay` +
		` url="wss://who-is-right.dondonald971.workers.dev/api/twilio/ws"` +
		` language="en-US"` +
		` ttsProvider="Google"` +
		` voice="en-US-Journey-F"` +
		` welcomeGreeting="Hi! I'm Aava, your sweet little assistant at Ask Kai. Court is open, vibes are high, and I'm here to help you settle the beef. What's going on, tell me everything!"` +
		`/>` +
		`</Connect>` +
		`</Response>`;

	return c.body(twiml, 200, {
		"Content-Type": "text/xml",
	});
};

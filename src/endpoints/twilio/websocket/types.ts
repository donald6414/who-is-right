/**
 * Twilio ConversationRelay → your server (incoming).
 * @see https://www.twilio.com/docs/voice/conversationrelay/websocket-messages
 */
export type TwilioSetupMessage = {
	type: "setup";
	sessionId: string;
	accountSid: string;
	parentCallSid?: string;
	callSid: string;
	from: string;
	to: string;
	forwardedFrom?: string;
	callType?: string;
	callerName?: string;
	direction?: string;
	callStatus?: string;
	customParameters?: Record<string, string>;
};

export type TwilioPromptMessage = {
	type: "prompt";
	voicePrompt: string;
	lang?: string;
	last?: boolean;
};

export type TwilioDtmfMessage = {
	type: "dtmf";
	digit: string;
};

export type TwilioInterruptMessage = {
	type: "interrupt";
	utteranceUntilInterrupt?: string;
	durationUntilInterruptMs?: number;
};

export type TwilioErrorMessage = {
	type: "error";
	description: string;
};

export type TwilioIncomingMessage =
	| TwilioSetupMessage
	| TwilioPromptMessage
	| TwilioDtmfMessage
	| TwilioInterruptMessage
	| TwilioErrorMessage
	| { type: string; [key: string]: unknown };

/**
 * Your server → Twilio ConversationRelay (outgoing TTS token).
 */
export type TwilioTextTokenMessage = {
	type: "text";
	token: string;
	last: boolean;
	lang?: string;
	interruptible?: boolean;
	preemptible?: boolean;
};

/** In-memory call session kept for the life of one WebSocket. */
export type AavaCallSession = {
	/** Twilio CallSid — also used as our chat room sessionId. */
	callSid: string;
	accountSid: string;
	twilioSessionId: string;
	fromPhone: string;
	toPhone: string;
	direction: string;
	callStatus: string;
	callType: string;
	callerName: string;
	forwardedFrom: string;
	parentCallSid: string;
};

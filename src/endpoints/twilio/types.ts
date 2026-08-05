/**
 * Twilio Voice webhook form fields (application/x-www-form-urlencoded).
 * @see https://www.twilio.com/docs/voice/twiml#request-parameters
 */
export type TwilioIncomingCallBody = {
	CallSid: string;
	AccountSid: string;
	ApiVersion: string;
	Direction: string;
	CallStatus: string;
	From: string;
	To: string;
	Caller: string;
	Called: string;
	FromCountry: string;
	FromState: string;
	FromCity: string;
	FromZip: string;
	ToCountry: string;
	ToState: string;
	ToCity: string;
	ToZip: string;
	CallerCountry: string;
	CallerState: string;
	CallerCity: string;
	CallerZip: string;
	CalledCountry: string;
	CalledState: string;
	CalledCity: string;
	CalledZip: string;
	StirVerstat: string;
	CallToken: string;
};

/**
 * Headers present on Twilio → Worker webhook requests.
 */
export type TwilioIncomingCallHeaders = {
	contentType: string;
	userAgent: string;
	host: string;
	contentLength: string;
	accept: string;
	acceptEncoding: string;
	connection: string;
	/** Cloudflare */
	cfConnectingIp: string;
	cfIpCountry: string;
	cfRay: string;
	cfVisitor: string;
	xForwardedProto: string;
	xRealIp: string;
	/** Twilio */
	twilioSignature: string;
	twilioIdempotencyToken: string;
	twilioAnswerTimeout: string;
	twilioServiceFlowEvent: string;
	twilioHomeRegion: string;
};

function asString(value: unknown): string {
	if (typeof value === "string") return value;
	if (value == null) return "";
	return String(value);
}

function header(headers: Headers, name: string): string {
	return headers.get(name) ?? "";
}

export function extractTwilioIncomingCallBody(
	raw: Record<string, unknown>,
): TwilioIncomingCallBody {
	return {
		CallSid: asString(raw.CallSid),
		AccountSid: asString(raw.AccountSid),
		ApiVersion: asString(raw.ApiVersion),
		Direction: asString(raw.Direction),
		CallStatus: asString(raw.CallStatus),
		From: asString(raw.From),
		To: asString(raw.To),
		Caller: asString(raw.Caller),
		Called: asString(raw.Called),
		FromCountry: asString(raw.FromCountry),
		FromState: asString(raw.FromState),
		FromCity: asString(raw.FromCity),
		FromZip: asString(raw.FromZip),
		ToCountry: asString(raw.ToCountry),
		ToState: asString(raw.ToState),
		ToCity: asString(raw.ToCity),
		ToZip: asString(raw.ToZip),
		CallerCountry: asString(raw.CallerCountry),
		CallerState: asString(raw.CallerState),
		CallerCity: asString(raw.CallerCity),
		CallerZip: asString(raw.CallerZip),
		CalledCountry: asString(raw.CalledCountry),
		CalledState: asString(raw.CalledState),
		CalledCity: asString(raw.CalledCity),
		CalledZip: asString(raw.CalledZip),
		StirVerstat: asString(raw.StirVerstat),
		CallToken: asString(raw.CallToken),
	};
}

export function extractTwilioIncomingCallHeaders(
	headers: Headers,
): TwilioIncomingCallHeaders {
	return {
		contentType: header(headers, "content-type"),
		userAgent: header(headers, "user-agent"),
		host: header(headers, "host"),
		contentLength: header(headers, "content-length"),
		accept: header(headers, "accept"),
		acceptEncoding: header(headers, "accept-encoding"),
		connection: header(headers, "connection"),
		cfConnectingIp: header(headers, "cf-connecting-ip"),
		cfIpCountry: header(headers, "cf-ipcountry"),
		cfRay: header(headers, "cf-ray"),
		cfVisitor: header(headers, "cf-visitor"),
		xForwardedProto: header(headers, "x-forwarded-proto"),
		xRealIp: header(headers, "x-real-ip"),
		twilioSignature: header(headers, "x-twilio-signature"),
		twilioIdempotencyToken: header(headers, "i-twilio-idempotency-token"),
		twilioAnswerTimeout: header(headers, "x-twilio-answertimeout"),
		twilioServiceFlowEvent: header(headers, "x-twilio-service-flow-event"),
		twilioHomeRegion: header(headers, "x-home-region"),
	};
}

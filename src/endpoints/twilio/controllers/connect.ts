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

    const twiml = `
                    <?xml version="1.0" encoding="UTF-8"?>

                    <Response>

                        <Connect>

                            <ConversationRelay
                                url="wss://who-is-right.dondonald971.workers.dev/api/twilio/ws/"
                                welcomeGreeting="Hello, I am Aava. How can I help you?"
                            />

                        </Connect>

                    </Response>
                    `;


    return c.body(
        twiml,
        200,
        {
            "Content-Type": "text/xml"
        }
    );
};

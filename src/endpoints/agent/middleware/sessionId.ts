import { createMiddleware } from "hono/factory";
import type { AppVariables } from "../../../types";

export const SESSION_ID_HEADER = "session-id";

/**
 * Ensures every agent request has a session-id.
 * If the client did not send one, generate a UUID, expose it on the
 * context, and echo it on the response so the client can reuse it.
 */
export const sessionIdMiddleware = createMiddleware<{
	Bindings: Env;
	Variables: AppVariables;
}>(async (c, next) => {
	const incoming =
		c.req.header(SESSION_ID_HEADER) ?? c.req.header("x-session-id");
	const sessionId = incoming?.trim() || crypto.randomUUID();

	c.set("sessionId", sessionId);
	c.header(SESSION_ID_HEADER, sessionId);

	await next();
});

import { Context } from "hono";

export const connect = async (c: Context<{ Bindings: Env }>) => {
	const headers = Object.fromEntries(c.req.raw.headers);
	const body = await c.req.parseBody();

	// Shows up in Cloudflare Workers Observability / wrangler tail
	console.log("twilio incoming-call headers", headers);
	console.log("twilio incoming-call body", body);

	return c.json({
		message: "Hello, world!",
	});
};

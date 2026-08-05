import { Context } from "hono";

export const connect = async (c: Context<{ Bindings: Env }>) => {
    // Get the incoming call from the request body

    const body = await c.req.parseBody();
    console.log(body);

    return c.json({
        message: "Hello, world!",
    });
};
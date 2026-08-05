import { Context } from "hono";

export const connect = async (c: Context<{ Bindings: Env }>) => {
    // Get the incoming call from the request body

    const body = await c.req.json();
    console.log(body);

    return c.json({
        message: "Hello, world!",
    });
};
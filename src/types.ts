import type { Context } from "hono";
import { z } from "zod";

declare module "hono" {
	interface ContextVariableMap {
		sessionId: string;
	}
}

export type AppVariables = {
	sessionId: string;
};

export type AppContext = Context<{
	Bindings: Env;
	Variables: AppVariables;
}>;

export const Task = z.object({
	name: z.string().openapi({ example: "lorem" }),
	slug: z.string(),
	description: z.string().optional(),
	completed: z.boolean().default(false),
	due_date: z.iso.date(),
});

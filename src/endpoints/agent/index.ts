import { Hono } from "hono";
import type { AppVariables } from "../../types";
import { sessionIdMiddleware } from "./middleware/sessionId";
import { kaiGet } from "./openAi/kaiGet";
import { kaiPost } from "./openAi/kaiPost";

const agent = new Hono<{ Bindings: Env; Variables: AppVariables }>();

agent.use("*", sessionIdMiddleware);

agent.get("/kai", kaiGet);
agent.post("/kai", kaiPost);

export default agent;

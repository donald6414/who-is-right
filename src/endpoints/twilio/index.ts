import { Hono } from "hono";
import { connect } from "./controllers/connect";
import websocket from "./websocket";

const twilio = new Hono<{ Bindings: Env }>();

twilio.post("/incoming-call", connect);
twilio.route("/ws", websocket);

export default twilio;

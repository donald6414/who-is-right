import { Hono } from "hono";
import { connect } from "./controllers/connect";

const twilio = new Hono();

twilio.post("/incoming-call", connect);

export default twilio;
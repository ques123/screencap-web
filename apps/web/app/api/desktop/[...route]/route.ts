import { Hono } from "hono";
import { handle } from "hono/vercel";

import { corsMiddleware } from "../../utils";

import * as root from "./root";
import * as session from "./session";
import * as video from "./video";

const app = new Hono()
	.basePath("/api/desktop")
	.use(corsMiddleware)
	.route("/session", session.app)
	.route("/video", video.app)
	.route("/", root.app);

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const OPTIONS = handle(app);
export const DELETE = handle(app);

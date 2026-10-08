import { HttpApi, OpenApi } from "@effect/platform";
import { EXTENSION_HTTP_PREFIX, ExtensionHttpApi } from "../Extension.ts";

export class ApiContract extends HttpApi.make("cap-web-api")
	.add(ExtensionHttpApi.prefix(EXTENSION_HTTP_PREFIX))
	.annotateContext(
		OpenApi.annotations({
			title: "Screencap HTTP API",
			description:
				"Internal API used by Screencap Desktop and external services",
		}),
	)
	.prefix("/api") {}

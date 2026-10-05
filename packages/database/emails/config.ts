import { buildEnv, serverEnv } from "@cap/env";
import type { JSXElementConstructor, ReactElement } from "react";
import { render } from "@react-email/render";
import { Resend } from "resend";

export const resend = () =>
	serverEnv().RESEND_API_KEY ? new Resend(serverEnv().RESEND_API_KEY) : null;

export const isEmailConfigured = () =>
	Boolean(serverEnv().BREVO_API_KEY || serverEnv().RESEND_API_KEY);

const DEFAULT_FROM_NAME = "Screencap";

// Parses "Name <addr@x.com>" or a bare address into Brevo's sender shape.
const parseSender = (raw: string | undefined) => {
	const env = serverEnv();
	const fallbackName = env.EMAIL_FROM_NAME || DEFAULT_FROM_NAME;
	const fallbackEmail =
		env.EMAIL_FROM ||
		(env.RESEND_FROM_DOMAIN ? `auth@${env.RESEND_FROM_DOMAIN}` : undefined);
	const source = raw || fallbackEmail;
	if (!source) return null;
	const match = source.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
	if (match) return { name: match[1] || fallbackName, email: match[2] };
	return { name: fallbackName, email: source.trim() };
};

let brevoIgnoredOptionsLogged = false;

const sendViaBrevo = async (
	apiKey: string,
	opts: {
		email: string;
		subject: string;
		react: ReactElement<unknown, string | JSXElementConstructor<unknown>>;
		cc?: string | string[];
		replyTo?: string;
		fromOverride?: string;
		scheduledAt?: string;
		idempotencyKey?: string;
		test?: boolean;
	},
) => {
	try {
		if (
			!brevoIgnoredOptionsLogged &&
			(opts.scheduledAt || opts.idempotencyKey || opts.test)
		) {
			brevoIgnoredOptionsLogged = true;
			console.warn(
				"Brevo email: scheduledAt, idempotencyKey and test options are ignored",
			);
		}
		// Overrides hardcoded to the upstream send.cap.so domain are not ours to use.
		const override =
			opts.fromOverride && !/send\.cap\.so/i.test(opts.fromOverride)
				? opts.fromOverride
				: undefined;
		const sender = parseSender(override);
		if (!sender) {
			console.error("Brevo email not sent: no EMAIL_FROM configured");
			return;
		}
		const htmlContent = await render(opts.react);
		const textContent = await render(opts.react, { plainText: true });
		const ccList = opts.cc
			? (Array.isArray(opts.cc) ? opts.cc : [opts.cc]).map((email) => ({
					email,
				}))
			: undefined;

		const res = await fetch("https://api.brevo.com/v3/smtp/email", {
			method: "POST",
			headers: {
				"api-key": apiKey,
				"content-type": "application/json",
				accept: "application/json",
			},
			body: JSON.stringify({
				sender,
				to: [{ email: opts.email }],
				subject: opts.subject,
				htmlContent,
				textContent,
				...(ccList ? { cc: ccList } : {}),
				...(opts.replyTo ? { replyTo: { email: opts.replyTo } } : {}),
			}),
		});
		if (!res.ok) {
			let message = "";
			try {
				const body = (await res.json()) as { message?: string };
				message = body?.message ?? "";
			} catch {}
			console.error(`Brevo email failed: HTTP ${res.status} ${message}`);
		}
	} catch (e) {
		console.error("Brevo email failed", e);
	}
};

export const sendEmail = async ({
	email,
	subject,
	react,
	marketing,
	test,
	scheduledAt,
	cc,
	replyTo,
	fromOverride,
	idempotencyKey,
	attachments,
}: {
	email: string;
	subject: string;
	react: ReactElement<unknown, string | JSXElementConstructor<unknown>>;
	marketing?: boolean;
	test?: boolean;
	scheduledAt?: string;
	cc?: string | string[];
	replyTo?: string;
	fromOverride?: string;
	idempotencyKey?: string;
	attachments?: {
		filename: string;
		content: Buffer | string;
		contentType?: string;
	}[];
}) => {
	const brevoKey = serverEnv().BREVO_API_KEY;
	const r = brevoKey ? null : resend();
	if (!brevoKey && !r) {
		return Promise.resolve();
	}

	if (marketing && !buildEnv.NEXT_PUBLIC_IS_CAP) return;

	if (brevoKey) {
		return sendViaBrevo(brevoKey, {
			email,
			subject,
			react,
			cc,
			replyTo,
			fromOverride,
			scheduledAt,
			idempotencyKey,
			test,
		});
	}
	if (!r) return;
	let from: string;

	if (fromOverride) from = fromOverride;
	else if (marketing) from = "Richie from Screencap <richie@send.cap.so>";
	else if (buildEnv.NEXT_PUBLIC_IS_CAP)
		from = "Screencap Auth <no-reply@auth.cap.so>";
	else
		from =
			serverEnv().EMAIL_FROM || `auth@${serverEnv().RESEND_FROM_DOMAIN}`;

	return r.emails.send(
		{
			from,
			to: test ? "delivered@resend.dev" : email,
			subject,
			react,
			scheduledAt,
			cc: test ? undefined : cc,
			replyTo: replyTo,
			attachments,
		},
		idempotencyKey ? { idempotencyKey } : undefined,
	);
};

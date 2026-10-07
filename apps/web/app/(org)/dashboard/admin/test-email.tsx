import { sendEmail } from "@cap/database/emails/config";

export async function sendTestEmailTo(email: string) {
	await sendEmail({
		email,
		subject: "Screencap test email",
		replyTo: "email@screencap.co",
		react: (
			<div style={{ fontFamily: "sans-serif", fontSize: 14 }}>
				<p>This is a test email from the Screencap admin panel.</p>
				<p>If you can read this, email sending works.</p>
			</div>
		),
	});
}

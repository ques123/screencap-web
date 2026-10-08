import { CAP_LOGO_URL } from "@cap/utils";
import {
	Body,
	Container,
	Head,
	Heading,
	Html,
	Img,
	Link,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";

export type ScreencapReportStage = "received" | "actioned" | "dismissed";

export function screencapReportSubject(stage: ScreencapReportStage) {
	return stage === "received"
		? "We received your report"
		: "We reviewed your report";
}

/**
 * Emails to the person who reported a recording (EU DSA Article 16: confirm receipt, then tell them the
 * decision). Only our own share link appears: never the recording's title, which its owner controls.
 */
export function ScreencapReport({
	stage = "received",
	link = "",
}: {
	stage: ScreencapReportStage;
	link: string;
}) {
	const subject = screencapReportSubject(stage);
	return (
		<Html>
			<Head />
			<Preview>{subject}</Preview>
			<Tailwind>
				<Body className="mx-auto my-auto bg-gray-1 font-sans">
					<Container className="mx-auto my-10 max-w-[500px] rounded border border-solid border-gray-200 px-10 py-5">
						<Section className="mt-8">
							<Img
								src={CAP_LOGO_URL}
								width="40"
								height="40"
								alt="Screencap"
								className="mx-auto my-0"
							/>
						</Section>
						<Heading className="mx-0 my-7 p-0 text-center text-xl font-semibold text-black">
							{subject}
						</Heading>
						{stage === "received" ? (
							<>
								<Text className="text-sm leading-6 text-black">
									Thank you for reporting this recording: {link}
								</Text>
								<Text className="text-sm leading-6 text-black">
									A person will review it, normally within 2 working days, and
									we will email you when we have decided. If you have more to
									tell us, reply to this email.
								</Text>
							</>
						) : (
							<>
								<Text className="text-sm leading-6 text-black">
									Thank you for reporting this recording: {link}
								</Text>
								<Text className="text-sm leading-6 text-black">
									{stage === "actioned"
										? "We reviewed it and took action under our Acceptable Use Policy. To protect everyone's privacy, we do not share the details of what we did."
										: "We reviewed it and decided that it does not break our Acceptable Use Policy, so we did not remove it."}{" "}
									A person made this decision. It was not made by automated
									tools.
								</Text>
								<Text className="text-sm leading-6 text-black">
									Our rules:{" "}
									<Link href="https://screencap.co/acceptable-use">
										https://screencap.co/acceptable-use
									</Link>
								</Text>
								{stage === "dismissed" ? (
									<>
										<Text className="text-sm leading-6 text-black">
											If you disagree, or have information we did not have,
											reply to this email or write to abuse@screencap.co within
											6 months. A person will look at it again and tell you the
											result. If the recording uses your copyrighted work, you
											can send a formal copyright notice:{" "}
											<Link href="https://screencap.co/report">
												https://screencap.co/report
											</Link>
										</Text>
										<Text className="text-sm leading-6 text-black">
											If you live in the European Union, you can also use an
											out-of-court dispute settlement body certified under the
											Digital Services Act, or go to a court.
										</Text>
									</>
								) : null}
							</>
						)}
						<Text className="text-[12px] leading-6 text-gray-500">
							Screencap, run by Dharma Loop LLC
						</Text>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}

export default ScreencapReport;

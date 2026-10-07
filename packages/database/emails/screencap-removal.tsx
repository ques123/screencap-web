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

export function screencapRemovalSubject(kind: "recording" | "account") {
	return kind === "recording"
		? "Your Screencap recording was removed"
		: "Your Screencap account was restricted";
}

export function ScreencapRemoval({
	kind = "recording",
	email = "",
	title = null,
	link = null,
	reason = "",
	source = "own",
}: {
	kind: "recording" | "account";
	email: string;
	title?: string | null;
	link?: string | null;
	reason: string;
	source: "report" | "own";
}) {
	const first =
		kind === "recording"
			? `We removed this recording from Screencap: ${title?.trim() || "(untitled)"}${link ? ` (${link})` : ""}.`
			: `We blocked your Screencap account (${email}). You can no longer sign in, and your recordings were made private.`;
	return (
		<Html>
			<Head />
			<Preview>{screencapRemovalSubject(kind)}</Preview>
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
							{screencapRemovalSubject(kind)}
						</Heading>
						<Text className="text-sm leading-6 text-black">{first}</Text>
						<Text className="text-sm leading-6 text-black">
							Why: {reason}
							<br />
							These rules are in our Acceptable Use Policy:{" "}
							<Link href="https://screencap.co/acceptable-use">
								https://screencap.co/acceptable-use
							</Link>
						</Text>
						<Text className="text-sm leading-6 text-black">
							{source === "own"
								? "We found this ourselves while reviewing the service."
								: "We acted after we received a report about this content."}{" "}
							A person made this decision. It was not made by automated tools.
						</Text>
						<Text className="text-sm leading-6 text-black">
							If you think we got this wrong, you can appeal. Reply to this
							email or write to email@screencap.co within 6 months, and tell us
							anything we should know. A person reviews every appeal, and we
							will tell you the result.
						</Text>
						<Text className="text-sm leading-6 text-black">
							If you live in the European Union, you can also use an
							out-of-court dispute settlement body certified under the Digital
							Services Act, or take the matter to a court. Appealing to us first
							is not required.
						</Text>
						<Text className="text-[12px] leading-6 text-gray-500">
							Screencap, run by Dharma Loop LLC
						</Text>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}

export default ScreencapRemoval;

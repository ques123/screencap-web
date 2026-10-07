"use client";

import { Button, Card, CardDescription, CardTitle, Input } from "@cap/ui";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ScreencapSettings } from "@/lib/screencap-admin";
import { Chip } from "../_components/format";
import { sendTestEmailAction, updateSettingsAction } from "../actions";

type Sources = Record<string, "panel" | "env">;

const providerNames = {
	cloudflare: "Cloudflare Email",
	brevo: "Brevo",
	resend: "Resend",
	none: "None set up",
} as const;

const list = (v: string) =>
	v
		.split(/[\s,]+/)
		.map((x) => x.trim())
		.filter(Boolean);

function Source({ value }: { value: "panel" | "env" | undefined }) {
	return value === "panel" ? (
		<Chip tone="blue">Set here</Chip>
	) : (
		<Chip>From server settings</Chip>
	);
}

const areaCls =
	"w-full px-3 py-2 text-[16px] md:text-[13px] rounded-xl border bg-gray-1 border-gray-4 text-gray-12 placeholder:text-gray-8 outline-0 focus:border-gray-6";

export function SettingsForm({
	settings,
	sources,
	emailProvider,
}: {
	settings: ScreencapSettings;
	sources: Sources;
	emailProvider: keyof typeof providerNames;
}) {
	const router = useRouter();
	const [pending, start] = useTransition();
	const [mode, setMode] = useState(settings.signupMode);
	const [domains, setDomains] = useState(settings.allowedDomains.join("\n"));
	const [blockedEmails, setBlockedEmails] = useState(
		settings.blockedEmails.join("\n"),
	);
	const [countries, setCountries] = useState(
		settings.blockedCountries.join(", "),
	);
	const [maxMin, setMaxMin] = useState(
		settings.maxRecordingMinutes?.toString() ?? "",
	);
	const [maxHours, setMaxHours] = useState(
		settings.maxStorageHours?.toString() ?? "",
	);
	const id = useId();

	const num = (v: string): number | null | "bad" => {
		const t = v.trim();
		if (!t) return null;
		const n = Number(t);
		return Number.isFinite(n) && n > 0 ? n : "bad";
	};

	const save = () => {
		const m = num(maxMin);
		const h = num(maxHours);
		if (m === "bad" || h === "bad") {
			toast.error("Limits must be numbers above 0, or empty for no limit.");
			return;
		}
		start(async () => {
			const r = await updateSettingsAction({
				signupMode: mode,
				allowedDomains: list(domains),
				blockedEmails: list(blockedEmails),
				blockedCountries: list(countries).map((c) => c.toUpperCase()),
				maxRecordingMinutes: m,
				maxStorageHours: h,
			});
			if (r.ok) toast.success(r.message);
			else toast.error(r.error);
			router.refresh();
		});
	};

	const test = () =>
		start(async () => {
			const r = await sendTestEmailAction();
			if (r.ok) toast.success(r.message);
			else toast.error(r.error);
			router.refresh();
		});

	return (
		<div className="flex flex-col gap-6">
			<Card className="space-y-4">
				<div className="flex flex-wrap gap-2 items-center">
					<CardTitle>Who can sign up</CardTitle>
					<Source value={sources.signupMode} />
				</div>
				<div className="space-y-2">
					<label className="flex gap-3 items-start text-sm text-gray-12">
						<input
							type="radio"
							name={`${id}-mode`}
							className="mt-1 size-4 accent-blue-600"
							checked={mode === "open"}
							onChange={() => setMode("open")}
						/>
						<span>
							Anyone
							<span className="block text-xs text-gray-10">
								Open sign-up, except the blocks below.
							</span>
						</span>
					</label>
					<label className="flex gap-3 items-start text-sm text-gray-12">
						<input
							type="radio"
							name={`${id}-mode`}
							className="mt-1 size-4 accent-blue-600"
							checked={mode === "allowlist"}
							onChange={() => setMode("allowlist")}
						/>
						<span>
							Only these email domains
							<span className="block text-xs text-gray-10">
								People with other domains cannot create an account.
							</span>
						</span>
					</label>
				</div>
				<div className="space-y-1">
					<div className="flex gap-2 items-center">
						<label htmlFor={`${id}-domains`} className="text-sm text-gray-11">
							Allowed domains (one per line)
						</label>
						<Source value={sources.allowedDomains} />
					</div>
					<textarea
						id={`${id}-domains`}
						rows={3}
						className={areaCls}
						placeholder="example.com"
						value={domains}
						onChange={(e) => setDomains(e.target.value)}
					/>
				</div>
			</Card>

			<Card className="space-y-4">
				<CardTitle>Blocks</CardTitle>
				<div className="space-y-1">
					<div className="flex gap-2 items-center">
						<label htmlFor={`${id}-be`} className="text-sm text-gray-11">
							Blocked emails or domains (one per line)
						</label>
						<Source value={sources.blockedEmails} />
					</div>
					<textarea
						id={`${id}-be`}
						rows={3}
						className={areaCls}
						value={blockedEmails}
						onChange={(e) => setBlockedEmails(e.target.value)}
					/>
				</div>
				<div className="space-y-1">
					<div className="flex gap-2 items-center">
						<label htmlFor={`${id}-bc`} className="text-sm text-gray-11">
							Blocked countries (two-letter codes, like RU, KP)
						</label>
						<Source value={sources.blockedCountries} />
					</div>
					<Input
						id={`${id}-bc`}
						value={countries}
						onChange={(e) => setCountries(e.target.value)}
					/>
				</div>
			</Card>

			<Card className="space-y-4">
				<CardTitle>Limits for everyone</CardTitle>
				<CardDescription>
					Empty means no limit. You can give one person a different limit on
					their user page.
				</CardDescription>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-1">
						<div className="flex gap-2 items-center">
							<label htmlFor={`${id}-min`} className="text-sm text-gray-11">
								Longest recording (minutes)
							</label>
							<Source value={sources.maxRecordingMinutes} />
						</div>
						<Input
							id={`${id}-min`}
							inputMode="decimal"
							placeholder="No limit"
							value={maxMin}
							onChange={(e) => setMaxMin(e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<div className="flex gap-2 items-center">
							<label htmlFor={`${id}-hrs`} className="text-sm text-gray-11">
								Storage per user (hours of video)
							</label>
							<Source value={sources.maxStorageHours} />
						</div>
						<Input
							id={`${id}-hrs`}
							inputMode="decimal"
							placeholder="No limit"
							value={maxHours}
							onChange={(e) => setMaxHours(e.target.value)}
						/>
					</div>
				</div>
				<Button
					type="button"
					size="sm"
					variant="dark"
					disabled={pending}
					spinner={pending}
					onClick={save}
				>
					Save settings
				</Button>
			</Card>

			<Card className="space-y-3">
				<CardTitle>Email</CardTitle>
				<CardDescription>
					Sending through {providerNames[emailProvider]}. The test email goes to
					your own address.
				</CardDescription>
				<div>
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled={pending || emailProvider === "none"}
						onClick={test}
					>
						Send test email to me
					</Button>
				</div>
			</Card>
		</div>
	);
}

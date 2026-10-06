"use client";

import {
	Button,
	Card,
	CardDescription,
	CardTitle,
	Input,
	Switch,
} from "@cap/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
	removeOpenRouterKey,
	saveOpenRouterKey,
	updateAiPreferences,
} from "@/actions/ai-settings";
import type { UserAiSettings } from "@/lib/ai/byok";
import type { ModelOption } from "@/lib/openrouter/catalog";
import { formatUsd } from "@/lib/openrouter/format-cost";

const MAX_SUMMARY_ROWS = 30;

function Badge({ children }: { children: string }) {
	return (
		<span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-md bg-green-500/10 text-green-600">
			{children}
		</span>
	);
}

function ModelRow({
	name,
	note,
	price,
	recommended,
	checked,
	disabled,
	groupName,
	onSelect,
}: {
	name: string;
	note?: string;
	price?: string;
	recommended?: boolean;
	checked: boolean;
	disabled: boolean;
	groupName: string;
	onSelect: () => void;
}) {
	return (
		<label
			className={`flex gap-3 items-start py-3 ${
				disabled ? "opacity-60" : "cursor-pointer"
			}`}
		>
			<input
				type="radio"
				name={groupName}
				checked={checked}
				disabled={disabled}
				onChange={onSelect}
				className="mt-1 size-4 accent-blue-600"
			/>
			<div className="flex-1 min-w-0">
				<div className="flex flex-wrap gap-2 items-center">
					<span className="text-sm font-medium text-gray-12 break-all">
						{name}
					</span>
					{recommended && <Badge>Recommended</Badge>}
				</div>
				{note && <p className="text-xs text-gray-10">{note}</p>}
			</div>
			{price && (
				<span className="text-sm text-right whitespace-nowrap text-gray-11">
					{price}
				</span>
			)}
		</label>
	);
}

export function AiSettings({
	settings,
	transcriptionOptions,
	summaryOptions,
	usage,
}: {
	settings: UserAiSettings;
	transcriptionOptions: ModelOption[];
	summaryOptions: ModelOption[];
	usage: { usageUsd: number } | null;
}) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const [keyInput, setKeyInput] = useState("");
	const [transcriptionModel, setTranscriptionModel] = useState(
		settings.transcriptionModel,
	);
	const [summaryModel, setSummaryModel] = useState(settings.summaryModel);
	const [zdr, setZdr] = useState(settings.zeroDataRetention);
	const [filter, setFilter] = useState("");
	const keyId = useId();
	const filterId = useId();
	const hasKey = settings.hasKey;

	useEffect(() => {
		setTranscriptionModel(settings.transcriptionModel);
		setSummaryModel(settings.summaryModel);
		setZdr(settings.zeroDataRetention);
	}, [settings]);

	useEffect(() => {
		if (searchParams.get("connected")) {
			toast.success("OpenRouter connected");
		} else if (searchParams.get("error")) {
			toast.error("Could not connect OpenRouter. Try again or paste a key.");
		} else {
			return;
		}
		router.replace("/dashboard/settings/ai");
	}, [searchParams, router]);

	const visibleSummary = useMemo(() => {
		const q = filter.trim().toLowerCase();
		const matches = q
			? summaryOptions.filter(
					(o) =>
						o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q),
				)
			: summaryOptions;
		const ordered = [
			...matches.filter((o) => o.recommended),
			...matches.filter((o) => !o.recommended),
		];
		const shown = ordered.slice(0, MAX_SUMMARY_ROWS);
		// Keep the current choice visible even when the filter hides it.
		const current = summaryOptions.find((o) => o.id === summaryModel);
		if (current && !shown.some((o) => o.id === current.id) && !q) {
			shown.push(current);
		}
		return { shown, total: ordered.length };
	}, [summaryOptions, filter, summaryModel]);

	const save = () => {
		startTransition(async () => {
			const result = await saveOpenRouterKey(keyInput);
			if (!result.ok) {
				toast.error(result.error);
				return;
			}
			setKeyInput("");
			toast.success("OpenRouter key saved");
			router.refresh();
		});
	};

	const remove = () => {
		startTransition(async () => {
			const result = await removeOpenRouterKey();
			if (!result.ok) {
				toast.error(result.error);
				return;
			}
			toast.success("OpenRouter key removed");
			router.refresh();
		});
	};

	const savePrefs = (
		patch: Parameters<typeof updateAiPreferences>[0],
		rollback: () => void,
	) => {
		startTransition(async () => {
			const result = await updateAiPreferences(patch);
			if (!result.ok) {
				rollback();
				toast.error(result.error);
				return;
			}
			router.refresh();
		});
	};

	const pickTranscription = (id: string | null) => {
		const previous = transcriptionModel;
		setTranscriptionModel(id);
		savePrefs({ transcriptionModel: id }, () =>
			setTranscriptionModel(previous),
		);
	};

	const pickSummary = (id: string | null) => {
		const previous = summaryModel;
		setSummaryModel(id);
		savePrefs({ summaryModel: id }, () => setSummaryModel(previous));
	};

	const toggleZdr = (value: boolean) => {
		const previous = zdr;
		setZdr(value);
		savePrefs({ zeroDataRetention: value }, () => setZdr(previous));
	};

	return (
		<div className="flex flex-col gap-6">
			<Card className="space-y-4">
				<div className="space-y-1">
					<CardTitle>OpenRouter key</CardTitle>
					<CardDescription>
						Transcripts and AI summaries run on your own OpenRouter account. You
						pay OpenRouter directly; Screencap adds nothing.
					</CardDescription>
				</div>
				{hasKey ? (
					<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<div className="space-y-1">
							<p className="font-mono text-sm text-gray-12">
								{settings.keyLabel ?? "Connected"}
							</p>
							{usage && (
								<p className="text-sm text-gray-11">
									{formatUsd(usage.usageUsd)} used on this key.
								</p>
							)}
							<a
								href="https://openrouter.ai/settings/credits"
								target="_blank"
								rel="noopener noreferrer"
								className="text-sm underline text-gray-11 hover:text-gray-12"
							>
								Manage credits on OpenRouter
							</a>
						</div>
						<Button
							type="button"
							size="sm"
							variant="destructive"
							onClick={remove}
							disabled={isPending}
						>
							Remove key
						</Button>
					</div>
				) : (
					<div className="space-y-4">
						<Button asChild size="sm" variant="primary">
							<a href="/api/integrations/openrouter/start">
								Connect OpenRouter
							</a>
						</Button>
						<form
							className="space-y-2"
							onSubmit={(e) => {
								e.preventDefault();
								save();
							}}
						>
							<label htmlFor={keyId} className="text-sm text-gray-11">
								or paste a key
							</label>
							<div className="flex gap-3">
								<Input
									id={keyId}
									type="password"
									autoComplete="off"
									placeholder="sk-or-..."
									value={keyInput}
									onChange={(e) => setKeyInput(e.target.value)}
								/>
								<Button
									type="submit"
									size="sm"
									variant="dark"
									disabled={isPending || !keyInput.trim()}
									spinner={isPending}
								>
									Save
								</Button>
							</div>
						</form>
					</div>
				)}
			</Card>

			{!hasKey && (
				<p className="text-sm text-gray-10">
					Add an OpenRouter key to choose models.
				</p>
			)}

			<Card className="space-y-4">
				<div className="space-y-1">
					<CardTitle>Transcription model</CardTitle>
					<CardDescription>
						Used to turn the audio of your recordings into a transcript and
						captions.
					</CardDescription>
				</div>
				<div className="divide-y divide-gray-4 [&>label]:py-3">
					{transcriptionOptions.map((o) => (
						<ModelRow
							key={o.id}
							groupName="transcription-model"
							name={o.name}
							note={o.note}
							price={o.perHourLabel}
							recommended={o.recommended}
							checked={transcriptionModel === o.id}
							disabled={!hasKey || isPending}
							onSelect={() => pickTranscription(o.id)}
						/>
					))}
					<ModelRow
						groupName="transcription-model"
						name="Off"
						note="No transcripts or captions"
						checked={transcriptionModel === null}
						disabled={!hasKey || isPending}
						onSelect={() => pickTranscription(null)}
					/>
				</div>
				<p className="text-xs text-gray-10">
					Cost is per hour of video, rounded up. A 5-minute recording costs a
					twelfth of that.
				</p>
			</Card>

			<Card className="space-y-4">
				<div className="space-y-1">
					<CardTitle>Summary model</CardTitle>
					<CardDescription>
						Writes titles, summaries and chapters for your recordings.
					</CardDescription>
				</div>
				<Input
					id={filterId}
					type="search"
					placeholder="Search models"
					aria-label="Search summary models"
					value={filter}
					onChange={(e) => setFilter(e.target.value)}
					disabled={!hasKey}
				/>
				<div className="divide-y divide-gray-4 [&>label]:py-3">
					<ModelRow
						groupName="summary-model"
						name="Off"
						note="No titles, summaries or chapters"
						checked={summaryModel === null}
						disabled={!hasKey || isPending}
						onSelect={() => pickSummary(null)}
					/>
					{visibleSummary.shown.map((o) => (
						<ModelRow
							key={o.id}
							groupName="summary-model"
							name={o.name}
							note={o.note}
							price={o.perHourLabel}
							recommended={o.recommended}
							checked={summaryModel === o.id}
							disabled={!hasKey || isPending}
							onSelect={() => pickSummary(o.id)}
						/>
					))}
				</div>
				{visibleSummary.total > MAX_SUMMARY_ROWS && (
					<p className="text-xs text-gray-10">
						Showing {MAX_SUMMARY_ROWS} of {visibleSummary.total}. Search to
						narrow the list.
					</p>
				)}
				{visibleSummary.total === 0 && (
					<p className="text-xs text-gray-10">No models match.</p>
				)}
			</Card>

			<Card className="flex gap-4 justify-between items-center">
				<div className="space-y-1">
					<CardTitle className="text-base">Zero data retention</CardTitle>
					<CardDescription>
						Only use providers that don't store your audio or transcripts. Fewer
						models may be available.
					</CardDescription>
				</div>
				<Switch
					checked={zdr}
					onCheckedChange={toggleZdr}
					disabled={!hasKey || isPending}
					aria-label="Zero data retention"
				/>
			</Card>
		</div>
	);
}

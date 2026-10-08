import { HoverCard } from "@kobalte/core/hover-card";
import { Switch as KSwitch } from "@kobalte/core/switch";
import { type as ostype } from "@tauri-apps/plugin-os";
import { cx } from "cva";
import { createSignal, type JSX, Show } from "solid-js";
import toast from "solid-toast";
import { useRecordingOptions } from "~/routes/(window-chrome)/OptionsContext";
import { generalSettingsStore } from "~/store";
import { confirmTurningOnEncryption, ENCRYPTION_SUMMARY } from "~/utils/e2ee";
import { commands, events, type RecordingMode } from "~/utils/tauri";
import IconLucideLock from "~icons/lucide/lock";
import IconLucideLockOpen from "~icons/lucide/lock-open";

interface ModeProps {
	onInfoClick?: () => void;
	locked?: boolean;
	encryptionLocked?: boolean;
}

type ModeButtonConfig = {
	mode: RecordingMode;
	label: string;
	description: string;
	settingsSection: "instant-quality" | "studio-quality" | null;
	icon: (props: { class?: string }) => JSX.Element;
	iconClass: string;
};

const MODE_BUTTONS: ModeButtonConfig[] = [
	{
		mode: "instant",
		label: "Instant mode",
		description:
			"No rendering required — uploads on the fly so you can share the link the moment you stop.",
		settingsSection: "instant-quality",
		icon: (p) => <IconCapInstant {...p} />,
		iconClass: "size-4 invert dark:invert-0",
	},
	{
		mode: "studio",
		label: "Studio mode",
		description:
			"Saves to your computer and opens the editor when you stop. Choose recording quality in settings.",
		settingsSection: "studio-quality",
		icon: (p) => <IconCapFilmCut {...p} />,
		iconClass: "size-[0.9rem] invert dark:invert-0",
	},
	{
		mode: "screenshot",
		label: "Screenshot mode",
		description: "Capture and annotate stills.",
		settingsSection: null,
		icon: (p) => <IconCapScreenshot {...p} />,
		iconClass: "size-[0.9rem] invert dark:invert-0",
	},
];

const HOVER_CARD_CLASS =
	"flex flex-col gap-2 px-3 py-2.5 rounded-lg border shadow-lg bg-gray-12 text-gray-1 border-gray-3 min-w-[12rem] max-w-[15rem]";

const EncryptionToggle = (props: {
	recording?: boolean;
	screenshotMode: boolean;
}) => {
	const generalSettings = generalSettingsStore.createQuery();
	const encrypted = () =>
		!props.screenshotMode && generalSettings.data?.encryptRecordings === true;
	const disabled = () =>
		props.screenshotMode || props.recording || generalSettings.isPending;
	const [saving, setSaving] = createSignal(false);

	const setEncrypted = async (next: boolean) => {
		if (disabled() || saving()) return;
		if (next && !(await confirmTurningOnEncryption())) return;
		setSaving(true);
		try {
			await generalSettingsStore.set({ encryptRecordings: next });
		} catch (error) {
			console.error("Failed to update encryption setting", error);
			toast.error("Could not change end-to-end encryption");
		} finally {
			setSaving(false);
		}
	};

	return (
		<HoverCard
			openDelay={120}
			closeDelay={80}
			placement="bottom-end"
			gutter={12}
		>
			<HoverCard.Trigger as="div" class="flex items-center">
				<KSwitch
					checked={encrypted()}
					onChange={(next) => void setEncrypted(next)}
					disabled={disabled()}
					aria-label="End-to-end encryption"
					class="flex items-center"
				>
					<KSwitch.Input class="peer sr-only" />
					<KSwitch.Control
						class={cx(
							"flex items-center p-0.5 w-12 h-7 rounded-full transition-colors duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500",
							encrypted() ? "bg-blue-9" : "bg-gray-6",
							disabled() ? "opacity-40 cursor-default" : "cursor-pointer",
						)}
					>
						<KSwitch.Thumb
							class={cx(
								"flex justify-center items-center bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.22)] transition-transform duration-200 size-6",
								encrypted() && "translate-x-5",
							)}
						>
							<Show
								when={encrypted()}
								fallback={<IconLucideLockOpen class="size-3 text-gray-10" />}
							>
								<IconLucideLock class="size-3 text-blue-10" />
							</Show>
						</KSwitch.Thumb>
					</KSwitch.Control>
				</KSwitch>
			</HoverCard.Trigger>
			<HoverCard.Portal>
				<HoverCard.Content class="z-50 outline-none animate-in fade-in slide-in-from-top-1 duration-100">
					<div class={HOVER_CARD_CLASS}>
						<div class="flex flex-col gap-0.5">
							<span class="text-xs font-medium">
								End-to-end encryption: {encrypted() ? "on" : "off"}
							</span>
							<span class="text-[10px] text-gray-4 leading-snug">
								{props.screenshotMode
									? "Screenshots can't be end-to-end encrypted yet."
									: props.recording
										? "Can't change during a recording."
										: ENCRYPTION_SUMMARY}
							</span>
						</div>
					</div>
				</HoverCard.Content>
			</HoverCard.Portal>
		</HoverCard>
	);
};

const Mode = (props: ModeProps) => {
	const { rawOptions, setOptions } = useRecordingOptions();

	const handleInfoClick = () => {
		if (props.locked) return;
		if (props.onInfoClick) {
			props.onInfoClick();
		} else {
			commands.showWindow("ModeSelect");
		}
	};

	const openQualitySettings = async (
		section: "instant-quality" | "studio-quality",
	) => {
		try {
			localStorage.setItem("cap.settings.scrollToSection", section);
		} catch {}
		await commands.showWindow({ Settings: { page: "quality" } });
		await events.requestScrollToSettingsSection.emit({ section });
	};

	return (
		<div class="flex relative gap-2 items-center p-1.5 rounded-full border border-gray-5 bg-gray-3 w-fit">
			<Show when={ostype() === "macos"}>
				<EncryptionToggle
					recording={props.encryptionLocked}
					screenshotMode={rawOptions.mode === "screenshot"}
				/>
				<div class="w-px h-5 bg-gray-6" aria-hidden="true" />
			</Show>

			<div class="flex relative gap-2 items-center">
				<button
					type="button"
					onClick={handleInfoClick}
					disabled={props.locked}
					class={cx(
						"absolute -left-1.5 -top-3.5 z-10 p-1 rounded-full w-fit bg-gray-5 group focus:outline-none",
						props.locked && "opacity-50",
					)}
					aria-label="Recording mode info"
				>
					<IconCapInfo class="invert transition-opacity duration-200 size-2.5 dark:invert-0 group-hover:opacity-50" />
				</button>

				{MODE_BUTTONS.map((button) => {
					const isSelected = () => rawOptions.mode === button.mode;

					return (
						<HoverCard
							openDelay={120}
							closeDelay={80}
							placement="bottom-end"
							gutter={12}
						>
							<HoverCard.Trigger
								as="button"
								type="button"
								onClick={() => {
									if (props.locked) return;
									setOptions({ mode: button.mode });
									commands.setRecordingMode(button.mode);
								}}
								aria-disabled={props.locked && !isSelected()}
								class={cx(
									"relative flex justify-center items-center rounded-full transition-all duration-200 size-7 focus:outline-none",
									isSelected()
										? "ring-2 ring-offset-1 ring-offset-gray-1 bg-gray-7 hover:bg-gray-7 ring-blue-500"
										: props.locked
											? "bg-gray-3 opacity-40 cursor-default"
											: "bg-gray-3 hover:bg-gray-7",
								)}
							>
								<button.icon class={button.iconClass} />
							</HoverCard.Trigger>
							<HoverCard.Portal>
								<HoverCard.Content class="z-50 outline-none animate-in fade-in slide-in-from-top-1 duration-100">
									<div class={HOVER_CARD_CLASS}>
										<div class="flex flex-col gap-0.5">
											<span class="text-xs font-medium">{button.label}</span>
											<span class="text-[10px] text-gray-4 leading-snug">
												{button.description}
											</span>
										</div>
										<Show when={button.settingsSection}>
											{(section) => (
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														void openQualitySettings(section());
													}}
													class="flex gap-1.5 items-center px-2 py-1 -mx-1 text-[11px] rounded-md transition-colors text-gray-4 hover:bg-gray-11 hover:text-gray-1"
												>
													<IconCapSettings class="size-3" />
													<span>Quality settings</span>
												</button>
											)}
										</Show>
									</div>
								</HoverCard.Content>
							</HoverCard.Portal>
						</HoverCard>
					);
				})}
			</div>
		</div>
	);
};

export default Mode;

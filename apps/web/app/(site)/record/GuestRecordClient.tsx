"use client";

import {
	canUseRecordingSpool,
	deleteRecoveredRecordingSpool,
	listRecordingSpoolSessions,
	recoverRecordingSpoolSession,
} from "@cap/recorder-core/recording-spool";
import { Button } from "@cap/ui";
import { useStore } from "@tanstack/react-store";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	clearGuestRecordingMeta,
	pickRecoverableGuestSpool,
	readGuestRecordingMeta,
} from "@/app/(org)/dashboard/caps/components/web-recorder-dialog/guest-recording";
import {
	type GuestRecorderController,
	WebRecorderDialog,
} from "@/app/(org)/dashboard/caps/components/web-recorder-dialog/web-recorder-dialog";
import { useUploadingContext } from "@/app/(org)/dashboard/caps/UploadingContext";
import { GuestSignInDialog } from "@/components/guest/GuestSignInDialog";
import {
	GUEST_EVENTS,
	type GuestBootstrap,
	type GuestSignInBlocked,
	trackGuestEvent,
} from "@/lib/guest-record";

type Stage =
	| "recorder"
	| "signin"
	| "cancelled"
	| "blocked"
	| "uploading"
	| "upload-error";

type PhaseState = {
	phase: string;
	completedShareUrl: string | null;
	videoId: string | null;
};

const UnsupportedBrowser = () => (
	<div className="mx-auto max-w-md rounded-xl border border-gray-5 bg-gray-1 p-6 text-center">
		<p className="text-gray-12">
			Screen recording isn't available in this browser. Use a computer, or an
			iPhone on iOS 27 or later.
		</p>
		<Button asChild variant="blue" className="mt-4">
			<Link href="/signup">Sign up</Link>
		</Button>
	</div>
);

const UploadProgress = () => {
	const { uploadingStore } = useUploadingContext();
	const status = useStore(uploadingStore, (s) => s.uploadStatus);
	const progress =
		status && "progress" in status
			? Math.round(Math.min(100, Math.max(0, status.progress)))
			: null;
	return (
		<div className="w-full max-w-sm">
			<div
				className="h-2 w-full overflow-hidden rounded-full bg-gray-4"
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={progress ?? undefined}
			>
				<div
					className={`h-full rounded-full bg-blue-9 transition-all ${progress === null ? "w-1/3 animate-pulse" : ""}`}
					style={progress === null ? undefined : { width: `${progress}%` }}
				/>
			</div>
			<p className="mt-2 text-sm text-gray-11">
				{progress === null ? "Getting ready" : `Uploading ${progress}%`}
			</p>
		</div>
	);
};

export function GuestRecordClient() {
	const [supported, setSupported] = useState<boolean | null>(null);
	const [recoveryChecked, setRecoveryChecked] = useState(false);
	const [recoverableId, setRecoverableId] = useState<string | null>(null);
	const [stage, setStage] = useState<Stage>("recorder");
	const [blockedMessage, setBlockedMessage] = useState("");
	const controllerRef = useRef<GuestRecorderController | null>(null);
	const phaseStateRef = useRef<PhaseState>({
		phase: "idle",
		completedShareUrl: null,
		videoId: null,
	});
	const completedHandledRef = useRef(false);

	useEffect(() => {
		setSupported(typeof navigator.mediaDevices?.getDisplayMedia === "function");
	}, []);

	useEffect(() => {
		let cancelled = false;
		const check = async () => {
			try {
				if (!canUseRecordingSpool()) return;
				const sessions = await listRecordingSpoolSessions();
				const pick = pickRecoverableGuestSpool(
					sessions,
					readGuestRecordingMeta(),
				);
				if (!cancelled && pick) setRecoverableId(pick.sessionId);
			} catch (error) {
				console.error("Failed to look for an unsent guest recording", error);
			} finally {
				if (!cancelled) setRecoveryChecked(true);
			}
		};
		void check();
		return () => {
			cancelled = true;
		};
	}, []);

	const handleAwaitingAuth = useCallback(() => setStage("signin"), []);

	const handlePhase = useCallback((state: PhaseState) => {
		phaseStateRef.current = state;
		if (
			state.phase === "completed" &&
			state.completedShareUrl &&
			!completedHandledRef.current
		) {
			completedHandledRef.current = true;
			trackGuestEvent(GUEST_EVENTS.uploaded);
			void (async () => {
				if (state.videoId) {
					void fetch("/api/record/claim", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ videoId: state.videoId }),
						keepalive: true,
					}).catch(() => {});
				}
				const target = new URL(
					state.completedShareUrl as string,
					location.href,
				);
				try {
					await navigator.clipboard.writeText(target.toString());
					target.searchParams.set("new", "1");
				} catch {
					// Some browsers refuse clipboard writes outside a click; the link is still on the page.
				}
				location.assign(target.toString());
			})();
		} else if (state.phase === "error") {
			setStage((current) =>
				current === "uploading" ? "upload-error" : current,
			);
		} else if (state.phase === "uploading") {
			setStage("uploading");
		}
	}, []);

	const guestProps = useMemo(
		() => ({
			onAwaitingAuth: handleAwaitingAuth,
			controllerRef,
			startClosed: Boolean(recoverableId),
			onPhaseChange: handlePhase,
		}),
		[handleAwaitingAuth, handlePhase, recoverableId],
	);

	const handleSignedIn = useCallback(async (bootstrap: GuestBootstrap) => {
		setStage("uploading");
		try {
			await controllerRef.current?.finishGuestUpload(bootstrap);
		} catch (error) {
			console.error("Guest upload failed", error);
			setStage("upload-error");
		}
	}, []);

	const handleBlocked = useCallback((blocked: GuestSignInBlocked) => {
		trackGuestEvent(GUEST_EVENTS.blocked);
		setBlockedMessage(blocked.message);
		setStage("blocked");
	}, []);

	const handleDownload = useCallback(() => {
		if (controllerRef.current?.downloadGuestRecording()) {
			trackGuestEvent(GUEST_EVENTS.downloaded);
		}
	}, []);

	const recordAgain = useCallback(async () => {
		await controllerRef.current?.discardGuestRecording();
		completedHandledRef.current = false;
		setStage("recorder");
		controllerRef.current?.openRecorder();
	}, []);

	// Reload recovery: open the saved copy as if it had just been recorded.
	const loadRecovered = useCallback(async () => {
		if (!recoverableId) return null;
		const recovered = await recoverRecordingSpoolSession(recoverableId);
		return recovered;
	}, [recoverableId]);

	const recoveredGetLink = useCallback(async () => {
		const recovered = await loadRecovered();
		if (!recovered) {
			setRecoverableId(null);
			return;
		}
		const adopted = controllerRef.current?.adoptRecoveredGuestRecording(
			recovered,
			readGuestRecordingMeta(),
		);
		if (adopted) {
			setRecoverableId(null);
			setStage("signin");
		}
	}, [loadRecovered]);

	const recoveredDownload = useCallback(async () => {
		const recovered = await loadRecovered();
		if (!recovered) return;
		const url = URL.createObjectURL(recovered.blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `screencap-recording-${new Date(recovered.createdAt)
			.toISOString()
			.replace(
				/[:.]/g,
				"-",
			)}.${recovered.mimeType.includes("webm") ? "webm" : "mp4"}`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 10_000);
		trackGuestEvent(GUEST_EVENTS.downloaded);
	}, [loadRecovered]);

	const recoveredDiscard = useCallback(async () => {
		if (!recoverableId) return;
		await deleteRecoveredRecordingSpool(recoverableId).catch(() => {});
		clearGuestRecordingMeta();
		setRecoverableId(null);
		controllerRef.current?.openRecorder();
	}, [recoverableId]);

	return (
		<main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center gap-5 px-6 py-24 text-center">
			<h1 className="text-4xl font-semibold">Record your screen</h1>
			<p className="text-gray-11">
				Free. No account needed until you want your link.
			</p>

			{supported === false && <UnsupportedBrowser />}

			{supported && recoveryChecked && (
				<>
					<WebRecorderDialog guest={guestProps} />

					{recoverableId && stage === "recorder" && (
						<div className="w-full max-w-sm rounded-xl border border-blue-6 bg-blue-3/60 p-4">
							<p className="text-sm font-medium text-blue-12">
								You have an unsent recording.
							</p>
							<div className="mt-3 flex flex-wrap justify-center gap-2">
								<Button variant="blue" size="sm" onClick={recoveredGetLink}>
									Get your link
								</Button>
								<Button variant="gray" size="sm" onClick={recoveredDownload}>
									Download
								</Button>
								<Button variant="gray" size="sm" onClick={recoveredDiscard}>
									Discard
								</Button>
							</div>
						</div>
					)}

					{stage === "cancelled" && (
						<div className="flex flex-wrap justify-center gap-2">
							<Button variant="blue" onClick={() => setStage("signin")}>
								Get your link
							</Button>
							<Button variant="gray" onClick={handleDownload}>
								Download
							</Button>
							<Button variant="gray" onClick={recordAgain}>
								Record again
							</Button>
						</div>
					)}

					{stage === "blocked" && (
						<div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-red-6 bg-red-3/70 p-4">
							<p className="text-sm text-red-12">{blockedMessage}</p>
							<div className="flex gap-2">
								<Button variant="blue" onClick={handleDownload}>
									Download your recording
								</Button>
								<Button variant="gray" onClick={recordAgain}>
									Record again
								</Button>
							</div>
						</div>
					)}

					{stage === "uploading" && <UploadProgress />}

					{stage === "upload-error" && (
						<div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-xl border border-red-6 bg-red-3/70 p-4">
							<p className="text-sm text-red-12">
								The upload was interrupted. Your recording is still here.
							</p>
							<div className="flex gap-2">
								<Button
									variant="blue"
									onClick={() => {
										setStage("uploading");
										void controllerRef.current?.retryUpload();
									}}
								>
									Retry upload
								</Button>
								<Button variant="gray" onClick={handleDownload}>
									Download
								</Button>
							</div>
						</div>
					)}

					<GuestSignInDialog
						open={stage === "signin"}
						onSignedIn={handleSignedIn}
						onBlocked={handleBlocked}
						onCancel={() => setStage("cancelled")}
					/>
				</>
			)}
		</main>
	);
}

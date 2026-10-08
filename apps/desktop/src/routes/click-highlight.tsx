import { listen } from "@tauri-apps/api/event";
import { createSignal, For, onCleanup, onMount } from "solid-js";

type ClickPayload = { x: number; y: number; button: number };
type Ripple = ClickPayload & { id: number };

const RIPPLE_MS = 450;
const RIPPLE_SIZE = 56;

export default function ClickHighlight() {
	const [ripples, setRipples] = createSignal<Ripple[]>([]);
	let nextId = 0;

	onMount(() => {
		document.documentElement.setAttribute("data-transparent-window", "true");
		document.documentElement.style.background = "transparent";
		document.body.style.background = "transparent";
		document.body.style.overflow = "hidden";

		const unlisten = listen<ClickPayload>("click-highlight", (event) => {
			const id = nextId++;
			setRipples((current) => [...current.slice(-7), { ...event.payload, id }]);
			setTimeout(
				() => setRipples((current) => current.filter((r) => r.id !== id)),
				RIPPLE_MS + 50,
			);
		});
		onCleanup(() => void unlisten.then((fn) => fn()));
	});

	return (
		<div class="fixed inset-0 overflow-hidden pointer-events-none bg-transparent">
			<style>{`
				@keyframes click-highlight-ring {
					from { transform: translate(-50%, -50%) scale(0.35); opacity: 0.95; }
					to { transform: translate(-50%, -50%) scale(1); opacity: 0; }
				}
			`}</style>
			<For each={ripples()}>
				{(ripple) => (
					<div
						style={{
							position: "absolute",
							left: `${ripple.x}px`,
							top: `${ripple.y}px`,
							width: `${RIPPLE_SIZE}px`,
							height: `${RIPPLE_SIZE}px`,
							"border-radius": "9999px",
							border: `3px solid ${ripple.button === 2 ? "rgba(255, 149, 0, 0.9)" : "rgba(10, 132, 255, 0.9)"}`,
							background:
								ripple.button === 2
									? "rgba(255, 149, 0, 0.18)"
									: "rgba(10, 132, 255, 0.18)",
							"box-sizing": "border-box",
							animation: `click-highlight-ring ${RIPPLE_MS}ms ease-out forwards`,
						}}
					/>
				)}
			</For>
		</div>
	);
}

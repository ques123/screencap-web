# Cap changes to tauri-runtime-wry

Vendored from crates.io `tauri-runtime-wry` 2.8.1, wired in through `[patch.crates-io]` in the
workspace `Cargo.toml`. Only `src/monitor/macos.rs` is patched.

## Why

On macOS, `Monitor::work_area()` moved the origin right by the visible frame's left inset (a Dock on
the left) but never down by its top inset, so the work area kept the menu bar and lost that many
points at the bottom instead. The main window clamps itself to the work area on open and focus,
which let it sit up to ~21pt under the menu bar with its header unreachable. The fix adds the top
inset: AppKit's frames are bottom-up, so it is the screen frame's top minus the visible frame's top.

Drop this patch once upstream `tauri-runtime-wry` offsets `position.y` the same way.

use cap_recording::sources::screen_capture::ScreenCaptureTarget;
use tauri::AppHandle;

#[cfg(target_os = "macos")]
mod imp {
    use super::*;
    use device_query::{DeviceQuery, DeviceState};
    use serde::Serialize;
    use std::{
        sync::{
            Mutex,
            atomic::{AtomicU64, Ordering},
        },
        time::Duration,
    };
    use tauri::{Emitter, LogicalPosition, LogicalSize, WebviewUrl, WebviewWindow};
    use tokio_util::sync::CancellationToken;
    use tracing::{debug, warn};

    const POLL_INTERVAL: Duration = Duration::from_millis(8);
    const EVENT_NAME: &str = "click-highlight";
    const WINDOW_TITLE: &str = "Screencap Click Highlight";
    const LEFT_BUTTON: usize = 1;
    const RIGHT_BUTTON: usize = 2;

    static ACTIVE: Mutex<Option<CancellationToken>> = Mutex::new(None);
    static NEXT_LABEL: AtomicU64 = AtomicU64::new(0);

    #[derive(Clone, Copy)]
    struct DisplayRect {
        x: f64,
        y: f64,
        width: f64,
        height: f64,
    }

    #[derive(Clone, Serialize)]
    struct ClickPayload {
        x: f64,
        y: f64,
        button: usize,
    }

    pub fn start(app: &AppHandle, target: &ScreenCaptureTarget) {
        if !matches!(
            target,
            ScreenCaptureTarget::Display { .. } | ScreenCaptureTarget::Area { .. }
        ) {
            return;
        }
        let Some(bounds) = target
            .display()
            .and_then(|display| display.raw_handle().logical_bounds())
        else {
            return;
        };
        let rect = DisplayRect {
            x: bounds.position().x(),
            y: bounds.position().y(),
            width: bounds.size().width(),
            height: bounds.size().height(),
        };

        let token = CancellationToken::new();
        replace_active(Some(token.clone()));

        let app = app.clone();
        tauri::async_runtime::spawn(async move {
            run(app, token, rect).await;
        });
    }

    pub fn stop() {
        replace_active(None);
    }

    fn replace_active(token: Option<CancellationToken>) {
        let mut active = ACTIVE.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(previous) = std::mem::replace(&mut *active, token) {
            previous.cancel();
        }
    }

    async fn run(app: AppHandle, token: CancellationToken, rect: DisplayRect) {
        let label = format!(
            "click-highlight-{}",
            NEXT_LABEL.fetch_add(1, Ordering::Relaxed)
        );

        let window = match build_window(&app, &label, rect) {
            Ok(window) => window,
            Err(error) => {
                warn!(%error, "Failed to create click highlight overlay");
                return;
            }
        };

        if token.is_cancelled() {
            let _ = window.destroy();
            return;
        }

        configure_panel(&app, &window).await;

        if token.is_cancelled() {
            let _ = window.destroy();
            return;
        }

        let _ = window.set_ignore_cursor_events(true);
        let _ = window.show();
        debug!(label = %label, "Click highlight overlay shown");

        let poll_token = token.clone();
        let poll_app = app.clone();
        let poll_label = label.clone();
        std::thread::spawn(move || poll_clicks(poll_app, poll_token, poll_label, rect));

        token.cancelled().await;
        let _ = window.destroy();
        debug!(label = %label, "Click highlight overlay closed");
    }

    fn build_window(
        app: &AppHandle,
        label: &str,
        rect: DisplayRect,
    ) -> tauri::Result<WebviewWindow> {
        let window = WebviewWindow::builder(app, label, WebviewUrl::App("/click-highlight".into()))
            .title(WINDOW_TITLE)
            .visible(false)
            .focused(false)
            .decorations(false)
            .transparent(true)
            .shadow(false)
            .resizable(false)
            .always_on_top(true)
            .visible_on_all_workspaces(true)
            .skip_taskbar(true)
            .accept_first_mouse(false)
            .content_protected(false)
            .inner_size(rect.width, rect.height)
            .position(rect.x, rect.y)
            .build()?;

        let _ = window.set_ignore_cursor_events(true);
        let _ = window.set_size(LogicalSize::new(rect.width, rect.height));
        let _ = window.set_position(LogicalPosition::new(rect.x, rect.y));
        Ok(window)
    }

    async fn configure_panel(app: &AppHandle, window: &WebviewWindow) {
        let (tx, rx) = tokio::sync::oneshot::channel();
        let window = window.clone();
        let scheduled = app.run_on_main_thread(move || {
            use crate::panel_manager::try_to_panel;
            use tauri_nspanel::cocoa::appkit::NSWindowCollectionBehavior;

            match try_to_panel(&window) {
                Ok(panel) => {
                    panel.set_level(cocoa::appkit::NSMainMenuWindowLevel);
                    panel.set_collection_behaviour(
                        NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
                            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary
                            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary
                            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorIgnoresCycle,
                    );

                    #[allow(non_upper_case_globals)]
                    const NSWindowStyleMaskNonActivatingPanel: i32 = 1 << 7;
                    panel.set_style_mask(NSWindowStyleMaskNonActivatingPanel);
                }
                Err(error) => {
                    warn!(?error, "Failed to convert click highlight overlay to panel");
                }
            }
            let _ = window.set_ignore_cursor_events(true);
            let _ = tx.send(());
        });

        if scheduled.is_ok() {
            let _ = rx.await;
        }
    }

    fn poll_clicks(app: AppHandle, token: CancellationToken, label: String, rect: DisplayRect) {
        let device_state = DeviceState::new();
        let mut last_buttons = device_state.get_mouse().button_pressed;

        while !token.is_cancelled() {
            std::thread::sleep(POLL_INTERVAL);

            let mouse = device_state.get_mouse();
            for button in [LEFT_BUTTON, RIGHT_BUTTON] {
                let pressed = mouse.button_pressed.get(button).copied().unwrap_or(false);
                let was_pressed = last_buttons.get(button).copied().unwrap_or(false);
                if pressed && !was_pressed {
                    let payload = ClickPayload {
                        x: f64::from(mouse.coords.0) - rect.x,
                        y: f64::from(mouse.coords.1) - rect.y,
                        button,
                    };
                    let _ = app.emit_to(label.as_str(), EVENT_NAME, payload);
                }
            }
            last_buttons = mouse.button_pressed;
        }
    }
}

#[cfg(target_os = "macos")]
pub fn start(app: &AppHandle, target: &ScreenCaptureTarget) {
    imp::start(app, target);
}

#[cfg(target_os = "macos")]
pub fn stop() {
    imp::stop();
}

#[cfg(not(target_os = "macos"))]
pub fn start(_app: &AppHandle, _target: &ScreenCaptureTarget) {}

#[cfg(not(target_os = "macos"))]
pub fn stop() {}

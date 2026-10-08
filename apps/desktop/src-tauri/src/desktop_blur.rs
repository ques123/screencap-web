#[cfg(target_os = "macos")]
mod imp {
    use std::{cell::RefCell, sync::Mutex};

    use objc2::{MainThreadMarker, MainThreadOnly, rc::Retained};
    use objc2_app_kit::{
        NSBackingStoreType, NSColor, NSScreen, NSVisualEffectBlendingMode, NSVisualEffectMaterial,
        NSVisualEffectState, NSVisualEffectView, NSWindow, NSWindowCollectionBehavior,
        NSWindowStyleMask,
    };
    use tauri::AppHandle;
    use tracing::{info, warn};

    const DESKTOP_ICON_WINDOW_LEVEL_KEY: i32 = 18;

    unsafe extern "C" {
        fn CGWindowLevelForKey(key: i32) -> i32;
    }

    thread_local! {
        static WINDOWS: RefCell<Vec<Retained<NSWindow>>> = const { RefCell::new(Vec::new()) };
    }

    static WINDOW_NUMBERS: Mutex<Vec<u32>> = Mutex::new(Vec::new());

    fn close_all() {
        WINDOWS.with(|windows| {
            for window in windows.borrow_mut().drain(..) {
                window.orderOut(None);
                window.close();
            }
        });
        if let Ok(mut numbers) = WINDOW_NUMBERS.lock() {
            numbers.clear();
        }
    }

    fn build(mtm: MainThreadMarker) {
        close_all();

        // One level above desktop icons so the wallpaper and icons are what
        // the behind-window blur samples, and every normal window stays above.
        let level = unsafe { CGWindowLevelForKey(DESKTOP_ICON_WINDOW_LEVEL_KEY) } + 1;
        let mut numbers = Vec::new();

        WINDOWS.with(|windows| {
            let mut windows = windows.borrow_mut();
            for screen in NSScreen::screens(mtm).iter() {
                let frame = screen.frame();
                let window = unsafe {
                    NSWindow::initWithContentRect_styleMask_backing_defer(
                        NSWindow::alloc(mtm),
                        frame,
                        NSWindowStyleMask::Borderless,
                        NSBackingStoreType::Buffered,
                        false,
                    )
                };
                unsafe {
                    window.setReleasedWhenClosed(false);
                    window.setLevel(level as isize);
                    window.setOpaque(false);
                    window.setHasShadow(false);
                    window.setIgnoresMouseEvents(true);
                    window.setBackgroundColor(Some(&NSColor::clearColor()));
                    window.setCollectionBehavior(
                        NSWindowCollectionBehavior::CanJoinAllSpaces
                            | NSWindowCollectionBehavior::Stationary
                            | NSWindowCollectionBehavior::IgnoresCycle
                            | NSWindowCollectionBehavior::FullScreenAuxiliary,
                    );

                    let effect = NSVisualEffectView::initWithFrame(
                        NSVisualEffectView::alloc(mtm),
                        objc2_foundation::NSRect::new(
                            objc2_foundation::NSPoint::new(0.0, 0.0),
                            frame.size,
                        ),
                    );
                    effect.setBlendingMode(NSVisualEffectBlendingMode::BehindWindow);
                    effect.setState(NSVisualEffectState::Active);
                    effect.setMaterial(NSVisualEffectMaterial::HUDWindow);
                    effect.setAutoresizingMask(
                        objc2_app_kit::NSAutoresizingMaskOptions::ViewWidthSizable
                            | objc2_app_kit::NSAutoresizingMaskOptions::ViewHeightSizable,
                    );
                    window.setContentView(Some(&effect));
                    window.setFrame_display(frame, false);
                    window.orderFrontRegardless();

                    numbers.push(window.windowNumber() as u32);
                }
                windows.push(window);
            }
        });

        info!(windows = numbers.len(), "Desktop blur windows shown");
        if let Ok(mut stored) = WINDOW_NUMBERS.lock() {
            *stored = numbers;
        }
    }

    pub async fn show(app: &AppHandle) {
        let (tx, rx) = tokio::sync::oneshot::channel();
        let scheduled = app.run_on_main_thread(move || {
            if let Some(mtm) = MainThreadMarker::new() {
                build(mtm);
            }
            let _ = tx.send(());
        });
        match scheduled {
            Ok(()) => {
                let _ = tokio::time::timeout(std::time::Duration::from_secs(2), rx).await;
            }
            Err(error) => warn!(%error, "Failed to schedule desktop blur windows"),
        }
    }

    pub fn hide(app: &AppHandle) {
        if WINDOW_NUMBERS
            .lock()
            .is_ok_and(|numbers| numbers.is_empty())
        {
            return;
        }
        if let Err(error) = app.run_on_main_thread(close_all) {
            warn!(%error, "Failed to schedule desktop blur teardown");
        }
    }

    pub fn window_numbers() -> Vec<u32> {
        WINDOW_NUMBERS
            .lock()
            .map(|numbers| numbers.clone())
            .unwrap_or_default()
    }
}

#[cfg(target_os = "macos")]
pub use imp::{hide, show, window_numbers};

#[cfg(not(target_os = "macos"))]
pub async fn show(_app: &tauri::AppHandle) {}

#[cfg(not(target_os = "macos"))]
pub fn hide(_app: &tauri::AppHandle) {}

#[cfg(not(target_os = "macos"))]
pub fn window_numbers() -> Vec<u32> {
    Vec::new()
}

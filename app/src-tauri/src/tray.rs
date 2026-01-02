use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime,
};

pub fn create_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    // Menu Items
    let capture_i = MenuItem::with_id(app, "capture", "📸 Capture (Ctrl+Shift+X)", true, None::<&str>)?;
    let show_i = MenuItem::with_id(app, "show", "🐕 Show Window", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit_i = MenuItem::with_id(app, "quit", "❌ Quit Screen Inu", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&capture_i, &show_i, &separator, &quit_i])?;

    let _tray = TrayIconBuilder::with_id("tray")
        .menu(&menu)
        .tooltip("Screen Inu - OCR Tool 🐕")
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "capture" => {
                // Emit event to frontend to trigger capture
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("tray-capture", ());
                }
            }
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                button: MouseButton::Left,
                ..
            } => {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            _ => {}
        })
        .icon(app.default_window_icon().unwrap().clone())
        .build(app)?;

    Ok(())
}


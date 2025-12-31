use xcap::Monitor;
use std::io::Cursor;
use base64::Engine;
use image::ImageFormat;

#[tauri::command]
fn capture_full_screen() -> Result<String, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    let monitor = monitors.first().ok_or("No monitor found")?;
    let image = monitor.capture_image().map_err(|e| e.to_string())?;
    
    let mut bytes: Vec<u8> = Vec::new();
    image::DynamicImage::ImageRgba8(image)
        .write_to(&mut Cursor::new(&mut bytes), ImageFormat::Png)
        .map_err(|e| e.to_string())?;

    let base64_str = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(base64_str)
}

use std::fs::File;
use std::io::Write;
use rusty_tesseract::{Args, Image};

#[tauri::command]
fn perform_ocr(base64_image: &str, langs: Option<String>) -> Result<String, String> {
    // Remove header if present
    let base64_data = base64_image.split(",").last().unwrap_or(base64_image);
    
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_data)
        .map_err(|e| e.to_string())?;

    let temp_path = std::env::temp_dir().join("ocr_input.png");
    let mut file = File::create(&temp_path).map_err(|e| e.to_string())?;
    file.write_all(&bytes).map_err(|e| e.to_string())?;

    let img = Image::from_path(temp_path.to_str().unwrap()).map_err(|e| e.to_string())?;
    
    let mut args = Args::default();
    // Default to English + Traditional Chinese if not specified
    // Note: User must have tesseract-lang installed
    args.lang = langs.unwrap_or("eng+chi_tra".to_string());
    
    let text = rusty_tesseract::image_to_string(&img, &args)
        .map_err(|e| e.to_string())?;
    
    Ok(text)
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

mod tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(desktop)]
            {
                tray::create_tray(app.handle())?;
            }
            Ok(())
        })
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_screenshots::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, capture_full_screen, perform_ocr])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

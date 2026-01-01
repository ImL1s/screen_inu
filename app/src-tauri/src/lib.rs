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
    args.psm = Some(6);
    
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
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, capture_full_screen, perform_ocr])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Read;
    use std::path::PathBuf;

    #[test]
    fn test_perform_ocr() {
        // Construct path to the sample image in the tests directory
        let mut d = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        d.push("tests/sample_ocr.png");

        println!("Testing OCR with image at: {:?}", d);

        // Read image file
        let mut file = std::fs::File::open(d).expect("failed to open sample image");
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer).expect("failed to read file");

        // Encode to base64 to simulate frontend input
        let base64_img = base64::engine::general_purpose::STANDARD.encode(&buffer);
        
        // Add data header like the real app does
        let data_url = format!("data:image/png;base64,{}", base64_img);

        // Call the command
        let result = perform_ocr(&data_url, Some("eng".to_string()));

        // Check verification
        match result {
            Ok(text) => {
                println!("OCR Result: '{}'", text);
                assert!(text.to_lowercase().contains("screen"), "Result should contain 'Screen'");
            },
            Err(e) => panic!("OCR failed: {}", e),
        }
    }

    #[test]
    fn test_perform_ocr_mixed() {
        // Construct path to the sample image
        let mut d = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        d.push("tests/sample_ocr_mixed.png");

        println!("Testing Chinese OCR with image at: {:?}", d);

        // Read image file
        let mut file = std::fs::File::open(d).expect("failed to open sample image");
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer).expect("failed to read file");

        // Encode to base64
        let base64_img = base64::engine::general_purpose::STANDARD.encode(&buffer);
        let data_url = format!("data:image/png;base64,{}", base64_img);

        // Call the command with Traditional Chinese
        let result = perform_ocr(&data_url, Some("eng+chi_tra".to_string()));

        // Check verification
        match result {
            Ok(text) => {
                println!("Mixed OCR Result: '{}'", text);
                // Note: Tesseract might return spaces or slightly different output depending on training data
                // We check for key characters
                assert!(text.to_lowercase().contains("screen") || text.contains("螢幕") || text.contains("截圖") || text.contains("Screen"), "Result should contain expected content");
            },
            Err(e) => panic!("Mixed OCR failed: {}", e),
        }
    }

    #[test]
    fn test_perform_ocr_japanese() {
        let mut d = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        d.push("tests/sample_ocr_japanese.png");
        let mut file = std::fs::File::open(d).expect("failed to open sample image");
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer).expect("failed to read file");
        let base64_img = base64::engine::general_purpose::STANDARD.encode(&buffer);
        let data_url = format!("data:image/png;base64,{}", base64_img);
        let result = perform_ocr(&data_url, Some("eng+jpn".to_string()));
        match result {
            Ok(text) => {
                println!("Japanese OCR Result: '{}'", text);
                // Allow English match since sometimes JPN model reads Katakana as English or vice versa
                assert!(text.to_lowercase().contains("screen") || text.contains("犬") || text.contains("テスト") || text.contains("Screen"), "Result should contain recognizable content");
            },
            Err(e) => panic!("Japanese OCR failed: {}", e),
        }
    }
}

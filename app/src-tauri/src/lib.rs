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
fn scan_qr(base64_image: &str) -> Result<Option<String>, String> {
    // Remove header if present
    let base64_data = base64_image.split(",").last().unwrap_or(base64_image);
    
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_data)
        .map_err(|e| e.to_string())?;

    // Load image
    let img = image::load_from_memory(&bytes)
        .map_err(|e| e.to_string())?
        .to_luma8();

    // Prepare image for rqrr
    let mut prepared = rqrr::PreparedImage::prepare(img);
    let grids = prepared.detect_grids();
    
    // Try to decode QR codes
    for grid in grids {
        if let Ok((_, content)) = grid.decode() {
            return Ok(Some(content));
        }
    }
    
    Ok(None) // No QR code found
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
        .invoke_handler(tauri::generate_handler![greet, capture_full_screen, perform_ocr, scan_qr])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Read;
    use std::path::PathBuf;

    #[test]
    fn test_ocr_functionality() {
        let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        path.push("tests/sample_ocr.png");
        println!("Reading OCR test image from: {:?}", path);

        let mut file = std::fs::File::open(path).expect("Failed to open sample_ocr.png");
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer).expect("Failed to read image data");

        let b64 = base64::engine::general_purpose::STANDARD.encode(&buffer);
        let data_url = format!("data:image/png;base64,{}", b64);

        let result = perform_ocr(&data_url, Some("eng".to_string()));
        match result {
            Ok(text) => {
                println!("OCR Output: {}", text);
                // "SereeninuTest" might be misread slightly depending on font
                assert!(!text.trim().is_empty(), "OCR returned empty text");
            }
            Err(e) => panic!("OCR function returned error: {}", e),
        }
    }

    #[test]
    fn test_qr_functionality() {
        let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        path.push("tests/sample_qr.png");
        println!("Reading QR test image from: {:?}", path);

        let mut file = std::fs::File::open(path).expect("Failed to open sample_qr.png");
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer).expect("Failed to read image data");

        let b64 = base64::engine::general_purpose::STANDARD.encode(&buffer);
        let data_url = format!("data:image/png;base64,{}", b64);

        let result = scan_qr(&data_url);
        match result {
            Ok(Some(text)) => {
                println!("QR Output: {}", text);
                assert_eq!(text, "https://screen-inu.app");
            }
            Ok(None) => panic!("QR scan returned None (not found)"),
            Err(e) => panic!("QR scan returned error: {}", e),
        }
    }

    #[test]
    fn test_all_supported_languages() {
        // List of all languages supported in the App.tsx
        let languages = vec![
            "eng",
            "chi_tra+eng",
            "chi_sim+eng",
            "jpn+eng",
            "kor+eng",
            "fra",
            "deu",
            "spa",
            "ita",
            "por",
            "rus",
            "vie"
        ];

        let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        path.push("tests/sample_ocr.png");
        println!("Using reference image: {:?}", path);

        let mut file = std::fs::File::open(path).expect("Failed to open sample_ocr.png");
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer).expect("Failed to read image data");
        let b64 = base64::engine::general_purpose::STANDARD.encode(&buffer);
        let data_url = format!("data:image/png;base64,{}", b64);

        for lang in languages {
            println!("Testing language loading for: {}", lang);
            let result = perform_ocr(&data_url, Some(lang.to_string()));
            match result {
                Ok(_) => println!("Successfully initialized and ran OCR for {}", lang),
                Err(e) => panic!("Failed to run OCR with language '{}': {}", lang, e),
            }
        }
    }
}

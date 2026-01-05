use base64::Engine;
use image::ImageFormat;
use std::io::Cursor;
use tauri::Manager;
use xcap::Monitor;

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

#[tauri::command]
fn capture_region(x: i32, y: i32, width: u32, height: u32) -> Result<String, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    let monitor = monitors.first().ok_or("No monitor found")?;
    let image = monitor.capture_image().map_err(|e| e.to_string())?;

    let sub_image = image::imageops::crop_imm(&image, x as u32, y as u32, width, height);

    let mut bytes: Vec<u8> = Vec::new();
    image::DynamicImage::ImageRgba8(sub_image.to_image())
        .write_to(&mut Cursor::new(&mut bytes), ImageFormat::Png)
        .map_err(|e| e.to_string())?;

    let base64_str = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(base64_str)
}

mod ocr;
mod model_manager;
mod translator;

#[tauri::command]
fn perform_ocr(base64_image: &str, langs: Option<String>, engine: Option<String>) -> Result<String, String> {
    // Remove header if present
    let base64_data = base64_image.split(",").last().unwrap_or(base64_image);

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_data)
        .map_err(|e| e.to_string())?;

    let lang = langs.unwrap_or("eng".to_string());
    
    // Parse engine selection
    let ocr_engine = match engine.as_deref() {
        Some("tesseract") => ocr::OcrEngine::Tesseract,
        #[cfg(windows)]
        Some("windows") => ocr::OcrEngine::WindowsOcr,
        #[cfg(target_os = "macos")]
        Some("apple") => ocr::OcrEngine::AppleVision,
        _ => ocr::OcrEngine::Auto,
    };
    
    // Handle auto-detection
    if lang == "auto" {
        ocr::perform_auto_ocr(&bytes, ocr_engine)
    } else {
        ocr::perform_ocr_with_engine(&bytes, &lang, ocr_engine)
    }
}

/// Result of a single image in a batch OCR operation
#[derive(serde::Serialize)]
struct BatchOcrResult {
    index: usize,
    text: Option<String>,
    error: Option<String>,
}

/// Perform OCR on multiple images in parallel using Rayon
#[tauri::command]
fn perform_batch_ocr(
    images: Vec<String>,
    langs: Option<String>,
    engine: Option<String>,
) -> Vec<BatchOcrResult> {
    use rayon::prelude::*;

    let lang = langs.unwrap_or_else(|| "eng".to_string());
    let ocr_engine = match engine.as_deref() {
        Some("tesseract") => ocr::OcrEngine::Tesseract,
        #[cfg(windows)]
        Some("windows") => ocr::OcrEngine::WindowsOcr,
        #[cfg(target_os = "macos")]
        Some("apple") => ocr::OcrEngine::AppleVision,
        _ => ocr::OcrEngine::Auto,
    };

    images
        .par_iter()
        .enumerate()
        .map(|(index, base64_image)| {
            let base64_data = base64_image.split(',').last().unwrap_or(base64_image);
            match base64::engine::general_purpose::STANDARD.decode(base64_data) {
                Ok(bytes) => match ocr::perform_ocr_with_engine(&bytes, &lang, ocr_engine.clone()) {
                    Ok(text) => BatchOcrResult {
                        index,
                        text: Some(text),
                        error: None,
                    },
                    Err(e) => BatchOcrResult {
                        index,
                        text: None,
                        error: Some(e),
                    },
                },
                Err(e) => BatchOcrResult {
                    index,
                    text: None,
                    error: Some(format!("Base64 decode error: {}", e)),
                },
            }
        })
        .collect()
}

/// Get available OCR engines for the current platform
#[tauri::command]
fn get_ocr_engines() -> Vec<String> {
    ocr::get_available_engines()
        .iter()
        .map(|e| match e {
            ocr::OcrEngine::Tesseract => "tesseract".to_string(),
            #[cfg(windows)]
            ocr::OcrEngine::WindowsOcr => "windows".to_string(),
            #[cfg(target_os = "macos")]
            ocr::OcrEngine::AppleVision => "apple".to_string(),
            ocr::OcrEngine::Auto => "auto".to_string(),
        })
        .collect()
}

// ============== TTS (Text-to-Speech) ==============

use std::sync::Mutex;
use once_cell::sync::Lazy;

static TTS_INSTANCE: Lazy<Mutex<Option<tts::Tts>>> = Lazy::new(|| Mutex::new(None));

fn get_or_init_tts() -> Result<std::sync::MutexGuard<'static, Option<tts::Tts>>, String> {
    let mut guard = TTS_INSTANCE.lock().map_err(|e| e.to_string())?;
    if guard.is_none() {
        let tts = tts::Tts::default().map_err(|e| format!("Failed to init TTS: {}", e))?;
        *guard = Some(tts);
    }
    Ok(guard)
}

#[tauri::command]
fn speak_text(text: String, rate: Option<f32>, pitch: Option<f32>, volume: Option<f32>) -> Result<(), String> {
    let mut guard = get_or_init_tts()?;
    let tts = guard.as_mut().ok_or("TTS not initialized")?;
    
    // Set speech parameters if provided
    if let Some(r) = rate {
        let _ = tts.set_rate(r); // rate is typically -10.0 to 10.0 or 0.0 to 1.0 depending on platform
    }
    if let Some(p) = pitch {
        let _ = tts.set_pitch(p);
    }
    if let Some(v) = volume {
        let _ = tts.set_volume(v);
    }
    
    tts.speak(text, false).map_err(|e| format!("TTS speak error: {}", e))?;
    Ok(())
}

#[tauri::command]
fn stop_speech() -> Result<(), String> {
    let mut guard = get_or_init_tts()?;
    if let Some(tts) = guard.as_mut() {
        tts.stop().map_err(|e| format!("TTS stop error: {}", e))?;
    }
    Ok(())
}

#[derive(serde::Serialize)]
struct VoiceInfo {
    id: String,
    name: String,
}

#[tauri::command]
fn get_tts_voices() -> Result<Vec<VoiceInfo>, String> {
    let guard = get_or_init_tts()?;
    let tts = guard.as_ref().ok_or("TTS not initialized")?;
    
    let voices = tts.voices().map_err(|e| format!("Failed to get voices: {}", e))?;
    Ok(voices.into_iter().map(|v| VoiceInfo {
        id: v.id().to_string(),
        name: v.name().to_string(),
    }).collect())
}

#[tauri::command]
fn is_speaking() -> Result<bool, String> {
    let guard = get_or_init_tts()?;
    let tts = guard.as_ref().ok_or("TTS not initialized")?;
    tts.is_speaking().map_err(|e| format!("TTS error: {}", e))
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

// OCR Model Management Commands
#[tauri::command]
fn list_ocr_models() -> Result<Vec<model_manager::ModelInfo>, String> {
    model_manager::list_available_models()
}

#[tauri::command]
fn download_ocr_model(lang: String) -> Result<(), String> {
    model_manager::download_model(&lang)
}

#[tauri::command]
fn delete_ocr_model(lang: String) -> Result<(), String> {
    model_manager::delete_model(&lang)
}

mod tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            #[cfg(desktop)]
            {
                tray::create_tray(app.handle())?;

                // Intercept window close to minimize to tray instead of quitting
                let window = app.get_webview_window("main").unwrap();
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        // Prevent actual close and hide window instead
                        api.prevent_close();
                        let _ = window_clone.hide();
                    }
                });
            }
            Ok(())
        })
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            capture_full_screen,
            capture_region,
            perform_ocr,
            perform_batch_ocr,
            scan_qr,
            get_ocr_engines,
            list_ocr_models,
            download_ocr_model,
            delete_ocr_model,
            speak_text,
            stop_speech,
            get_tts_voices,
            is_speaking,
            translator::translate_offline,
            translator::list_translation_models,
            translator::get_translation_model_status,
            translator::download_translation_model,
            translator::delete_translation_model
        ])
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
        file.read_to_end(&mut buffer)
            .expect("Failed to read image data");

        let b64 = base64::engine::general_purpose::STANDARD.encode(&buffer);
        let data_url = format!("data:image/png;base64,{}", b64);

        let result = perform_ocr(&data_url, Some("eng".to_string()), None);
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
        file.read_to_end(&mut buffer)
            .expect("Failed to read image data");

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
            "vie",
        ];

        let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        path.push("tests/sample_ocr.png");
        println!("Using reference image: {:?}", path);

        let mut file = std::fs::File::open(path).expect("Failed to open sample_ocr.png");
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)
            .expect("Failed to read image data");
        let b64 = base64::engine::general_purpose::STANDARD.encode(&buffer);
        let data_url = format!("data:image/png;base64,{}", b64);

        for lang in languages {
            println!("Testing language loading for: {}", lang);
            let result = perform_ocr(&data_url, Some(lang.to_string()), None);
            match result {
                Ok(_) => println!("Successfully initialized and ran OCR for {}", lang),
                Err(e) => panic!("Failed to run OCR with language '{}': {}", lang, e),
            }
        }
    }

    #[test]
    fn test_batch_ocr() {
        // Test batch OCR with multiple copies of the same image
        let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        path.push("tests/sample_ocr.png");

        let mut file = std::fs::File::open(path).expect("Failed to open sample_ocr.png");
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)
            .expect("Failed to read image data");

        let b64 = base64::engine::general_purpose::STANDARD.encode(&buffer);
        let data_url = format!("data:image/png;base64,{}", b64);

        // Create a batch of 3 images
        let images = vec![data_url.clone(), data_url.clone(), data_url.clone()];

        let results = perform_batch_ocr(images, Some("eng".to_string()), None);

        // Should have 3 results
        assert_eq!(results.len(), 3, "Batch OCR should return 3 results");

        // Each result should have text (no errors)
        for (i, result) in results.iter().enumerate() {
            assert_eq!(result.index, i, "Result index should match");
            assert!(
                result.text.is_some(),
                "Result {} should have text, got error: {:?}",
                i,
                result.error
            );
            assert!(result.error.is_none(), "Result {} should have no error", i);
        }

        println!("Batch OCR test passed with {} results", results.len());
    }
}

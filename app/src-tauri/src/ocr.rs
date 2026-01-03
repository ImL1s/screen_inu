// OCR Engine abstraction and implementations
// Supports: Tesseract (all platforms), Windows OCR (Windows), Apple Vision (macOS)

use std::fs::File;
use std::io::Write;

/// OCR Engine types
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum OcrEngine {
    Tesseract,
    #[cfg(windows)]
    WindowsOcr,
    #[cfg(target_os = "macos")]
    AppleVision,
    Auto, // Automatically select best engine for the language
}

impl Default for OcrEngine {
    fn default() -> Self {
        OcrEngine::Auto
    }
}

/// Get the best OCR engine for a given language
pub fn get_best_engine_for_language(lang: &str) -> OcrEngine {
    // For CJK languages, prefer native OCR on Windows/macOS
    let is_cjk = lang.starts_with("chi_") 
        || lang.starts_with("jpn") 
        || lang.starts_with("kor")
        || lang.contains("chi_")
        || lang.contains("jpn")
        || lang.contains("kor");
    
    if is_cjk {
        #[cfg(windows)]
        return OcrEngine::WindowsOcr;
        
        #[cfg(target_os = "macos")]
        return OcrEngine::AppleVision;
    }
    
    OcrEngine::Tesseract
}

/// Map Tesseract language code to Windows OCR language tag
#[cfg(windows)]
fn tesseract_lang_to_windows(lang: &str) -> Option<&'static str> {
    // Only take the first language if multiple are specified
    let primary_lang = lang.split('+').next().unwrap_or(lang);
    
    match primary_lang {
        "eng" => Some("en-US"),
        "chi_tra" => Some("zh-Hant-TW"),
        "chi_sim" => Some("zh-Hans-CN"),
        "jpn" => Some("ja-JP"),
        "kor" => Some("ko-KR"),
        "fra" => Some("fr-FR"),
        "deu" => Some("de-DE"),
        "spa" => Some("es-ES"),
        "ita" => Some("it-IT"),
        "por" => Some("pt-BR"),
        "rus" => Some("ru-RU"),
        "vie" => Some("vi-VN"),
        _ => None,
    }
}

/// Perform OCR using Windows OCR API
#[cfg(windows)]
pub fn perform_windows_ocr(image_bytes: &[u8], lang: &str) -> Result<String, String> {
    use windows::core::HSTRING;
    use windows::Globalization::Language;
    use windows::Graphics::Imaging::BitmapDecoder;
    use windows::Media::Ocr::OcrEngine as WinOcrEngine;
    use windows::Storage::Streams::{DataWriter, InMemoryRandomAccessStream};

    // Get the Windows language tag
    let win_lang = tesseract_lang_to_windows(lang)
        .ok_or_else(|| format!("Language '{}' not supported by Windows OCR", lang))?;

    // Create language object
    let language = Language::CreateLanguage(&HSTRING::from(win_lang))
        .map_err(|e| format!("Failed to create language: {}", e))?;

    // Check if language is supported
    if !WinOcrEngine::IsLanguageSupported(&language)
        .map_err(|e| format!("Failed to check language support: {}", e))? 
    {
        return Err(format!(
            "Windows OCR does not support language '{}'. Please install the language pack.",
            win_lang
        ));
    }

    // Create OCR engine for the language
    // TryCreateFromLanguage returns Result<OcrEngine, Error>, not Result<Option<OcrEngine>>
    let ocr_engine = WinOcrEngine::TryCreateFromLanguage(&language)
        .map_err(|e| format!("Failed to create OCR engine: {}", e))?;

    // Create in-memory stream from image bytes
    let stream = InMemoryRandomAccessStream::new()
        .map_err(|e| format!("Failed to create stream: {}", e))?;
    
    let writer = DataWriter::CreateDataWriter(&stream)
        .map_err(|e| format!("Failed to create data writer: {}", e))?;
    
    writer.WriteBytes(image_bytes)
        .map_err(|e| format!("Failed to write bytes: {}", e))?;
    
    writer.StoreAsync()
        .map_err(|e| format!("Failed to store async: {}", e))?
        .get()
        .map_err(|e| format!("Failed to store: {}", e))?;
    
    writer.FlushAsync()
        .map_err(|e| format!("Failed to flush async: {}", e))?
        .get()
        .map_err(|e| format!("Failed to flush: {}", e))?;

    // Reset stream position
    stream.Seek(0)
        .map_err(|e| format!("Failed to seek: {}", e))?;

    // Decode image
    let decoder = BitmapDecoder::CreateAsync(&stream)
        .map_err(|e| format!("Failed to create decoder async: {}", e))?
        .get()
        .map_err(|e| format!("Failed to create decoder: {}", e))?;

    let bitmap = decoder.GetSoftwareBitmapAsync()
        .map_err(|e| format!("Failed to get bitmap async: {}", e))?
        .get()
        .map_err(|e| format!("Failed to get bitmap: {}", e))?;

    // Perform OCR
    let result = ocr_engine.RecognizeAsync(&bitmap)
        .map_err(|e| format!("Failed to recognize async: {}", e))?
        .get()
        .map_err(|e| format!("Failed to recognize: {}", e))?;

    // Get text
    let text = result.Text()
        .map_err(|e| format!("Failed to get text: {}", e))?
        .to_string();

    Ok(text)
}

/// Placeholder for Apple Vision OCR (macOS)
#[cfg(target_os = "macos")]
pub fn perform_apple_vision_ocr(_image_bytes: &[u8], _lang: &str) -> Result<String, String> {
    // TODO: Implement using objc2 and Vision framework
    Err("Apple Vision OCR not yet implemented".to_string())
}

/// Get the resource directory path where bundled files are located
pub fn get_resource_dir() -> Result<std::path::PathBuf, String> {
    // Check for development path FIRST (CARGO_MANIFEST_DIR contains tessdata)
    let dev_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    if dev_path.join("tessdata").exists() {
        return Ok(dev_path);
    }
    
    // In production, resources are relative to the executable
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_dir = exe_path.parent().ok_or("Failed to get exe directory")?;
    
    // On Windows/macOS/Linux production, tessdata is in the same directory as the exe
    if exe_dir.join("tessdata").exists() {
        return Ok(exe_dir.to_path_buf());
    }
    
    // Fallback to development path even if tessdata doesn't exist
    Ok(dev_path)
}

/// Get the tesseract executable path
pub fn get_tesseract_path() -> Result<std::path::PathBuf, String> {
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_dir = exe_path.parent().ok_or("Failed to get exe directory")?;
    
    let tesseract_name = if cfg!(windows) { "tesseract.exe" } else { "tesseract" };
    
    // Check same directory as exe
    let prod_path = exe_dir.join(tesseract_name);
    if prod_path.exists() {
        return Ok(prod_path);
    }
    
    // Check binaries subdirectory in production
    let binaries_path = exe_dir.join("binaries").join(tesseract_name);
    if binaries_path.exists() {
        return Ok(binaries_path);
    }
    
    // Development: use the bundled binary with correct target triple suffix
    let dev_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    
    #[cfg(all(target_os = "windows", target_arch = "x86_64"))]
    let sidecar_name = "tesseract-x86_64-pc-windows-msvc.exe";
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    let sidecar_name = "tesseract-aarch64-apple-darwin";
    #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
    let sidecar_name = "tesseract-x86_64-apple-darwin";
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    let sidecar_name = "tesseract-x86_64-unknown-linux-gnu";
    #[cfg(not(any(
        all(target_os = "windows", target_arch = "x86_64"),
        all(target_os = "macos", target_arch = "aarch64"),
        all(target_os = "macos", target_arch = "x86_64"),
        all(target_os = "linux", target_arch = "x86_64")
    )))]
    let sidecar_name = tesseract_name;
    
    let dev_path = dev_dir.join("binaries").join(sidecar_name);
    if dev_path.exists() {
        return Ok(dev_path);
    }
    
    // Final fallback: try system tesseract
    if cfg!(windows) {
        let program_files = std::path::PathBuf::from("C:\\Program Files\\Tesseract-OCR\\tesseract.exe");
        if program_files.exists() {
            return Ok(program_files);
        }
    }
    
    Ok(std::path::PathBuf::from(tesseract_name))
}

/// Perform OCR using Tesseract
pub fn perform_tesseract_ocr(image_bytes: &[u8], lang: &str) -> Result<String, String> {
    use std::process::Command;
    
    let temp_path = std::env::temp_dir().join("ocr_input.png");
    let mut file = File::create(&temp_path).map_err(|e| e.to_string())?;
    file.write_all(image_bytes).map_err(|e| e.to_string())?;
    drop(file);

    let tesseract_path = get_tesseract_path()?;
    let resource_dir = get_resource_dir()?;
    let tessdata_dir = resource_dir.join("tessdata");
    
    let mut cmd = Command::new(&tesseract_path);
    cmd.arg(temp_path.to_str().unwrap())
       .arg("stdout")
       .arg("-l")
       .arg(lang)
       .arg("--psm")
       .arg("6");
    
    if tessdata_dir.exists() {
        cmd.env("TESSDATA_PREFIX", &tessdata_dir);
    }
    
    #[cfg(windows)]
    {
        let binaries_dir = resource_dir.join("binaries");
        if binaries_dir.exists() {
            if let Ok(current_path) = std::env::var("PATH") {
                cmd.env("PATH", format!("{};{}", binaries_dir.display(), current_path));
            } else {
                cmd.env("PATH", binaries_dir.to_str().unwrap());
            }
        }
    }
    
    let output = cmd.output().map_err(|e| {
        format!(
            "Failed to execute tesseract at '{}': {}. Please check installation path!",
            tesseract_path.display(),
            e
        )
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Tesseract error: {}", stderr));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Main OCR function that selects the appropriate engine
pub fn perform_ocr_with_engine(
    image_bytes: &[u8], 
    lang: &str, 
    engine: OcrEngine
) -> Result<String, String> {
    let actual_engine = if engine == OcrEngine::Auto {
        get_best_engine_for_language(lang)
    } else {
        engine
    };
    
    match actual_engine {
        OcrEngine::Tesseract => perform_tesseract_ocr(image_bytes, lang),
        
        #[cfg(windows)]
        OcrEngine::WindowsOcr => {
            // Try Windows OCR, fallback to Tesseract if it fails
            match perform_windows_ocr(image_bytes, lang) {
                Ok(text) => Ok(text),
                Err(e) => {
                    eprintln!("Windows OCR failed: {}, falling back to Tesseract", e);
                    perform_tesseract_ocr(image_bytes, lang)
                }
            }
        }
        
        #[cfg(target_os = "macos")]
        OcrEngine::AppleVision => {
            match perform_apple_vision_ocr(image_bytes, lang) {
                Ok(text) => Ok(text),
                Err(e) => {
                    eprintln!("Apple Vision OCR failed: {}, falling back to Tesseract", e);
                    perform_tesseract_ocr(image_bytes, lang)
                }
            }
        }
        
        OcrEngine::Auto => perform_tesseract_ocr(image_bytes, lang),
    }
}

/// Get list of available OCR engines for the current platform
pub fn get_available_engines() -> Vec<OcrEngine> {
    let mut engines = vec![OcrEngine::Tesseract, OcrEngine::Auto];
    
    #[cfg(windows)]
    engines.push(OcrEngine::WindowsOcr);
    
    #[cfg(target_os = "macos")]
    engines.push(OcrEngine::AppleVision);
    
    engines
}

//! Offline Translation Module using Tract ONNX
//! 
//! Provides privacy-preserving local neural machine translation
//! using MarianMT OPUS models via the tract-onnx crate.

use std::path::PathBuf;
use std::sync::Mutex;
use once_cell::sync::Lazy;
use tract_onnx::prelude::*;
use tokenizers::Tokenizer;

/// Thread-safe singleton for the translator instance
static TRANSLATOR_INSTANCE: Lazy<Mutex<Option<TranslatorService>>> = Lazy::new(|| Mutex::new(None));

/// Available translation model information
#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct TranslationModelInfo {
    pub name: String,
    pub source_lang: String,
    pub target_lang: String,
    pub size_bytes: u64,
    pub installed: bool,
    pub download_url: Option<String>,
}

/// Manages ONNX model lifecycle
pub struct TranslatorService {
    model: SimplePlan<TypedFact, Box<dyn TypedOp>, Graph<TypedFact, Box<dyn TypedOp>>>,
    tokenizer: Tokenizer,
    current_model: String,
}

impl TranslatorService {
    /// Create a new translator service with the specified model
    pub fn new(model_path: &str) -> Result<Self, String> {
        let model_dir = PathBuf::from(model_path);
        
        // Load ONNX model
        let model_file = model_dir.join("model.onnx");
        let model = tract_onnx::onnx()
            .model_for_path(&model_file)
            .map_err(|e| format!("Failed to load ONNX model: {}", e))?
            .into_optimized()
            .map_err(|e| format!("Failed to optimize model: {}", e))?
            .into_runnable()
            .map_err(|e| format!("Failed to create runnable model: {}", e))?;
        
        // Load tokenizer
        let tokenizer_path = model_dir.join("tokenizer.json");
        let tokenizer = Tokenizer::from_file(&tokenizer_path)
            .map_err(|e| format!("Failed to load tokenizer: {}", e))?;
        
        Ok(Self {
            model,
            tokenizer,
            current_model: model_path.to_string(),
        })
    }
    
    /// Translate text
    pub fn translate(&self, text: &str) -> Result<String, String> {
        if text.trim().is_empty() {
            return Ok(String::new());
        }
        
        // Tokenize input
        let encoding = self.tokenizer.encode(text, true)
            .map_err(|e| format!("Tokenization failed: {}", e))?;
        
        let input_ids: Vec<i64> = encoding.get_ids().iter().map(|&id| id as i64).collect();
        let attention_mask: Vec<i64> = encoding.get_attention_mask().iter().map(|&m| m as i64).collect();
        
        // Prepare tensors
        let seq_len = input_ids.len();
        let input_tensor: Tensor = tract_ndarray::Array2::from_shape_vec(
            (1, seq_len),
            input_ids,
        ).map_err(|e| format!("Failed to create input tensor: {}", e))?.into();
        
        let attention_tensor: Tensor = tract_ndarray::Array2::from_shape_vec(
            (1, seq_len),
            attention_mask,
        ).map_err(|e| format!("Failed to create attention tensor: {}", e))?.into();
        
        // Run inference
        let outputs = self.model.run(tvec!(input_tensor.into(), attention_tensor.into()))
            .map_err(|e| format!("Inference failed: {}", e))?;
        
        // Extract output tokens
        let output = outputs[0].to_array_view::<i64>()
            .map_err(|e| format!("Failed to extract output: {}", e))?;
        
        let output_ids: Vec<u32> = output.iter().map(|&id| id as u32).collect();
        
        // Decode tokens back to text
        let decoded = self.tokenizer.decode(&output_ids, true)
            .map_err(|e| format!("Decoding failed: {}", e))?;
        
        Ok(decoded)
    }
}

/// Get the models directory path
pub fn get_models_dir() -> Result<PathBuf, String> {
    #[cfg(target_os = "windows")]
    {
        let app_data = std::env::var("APPDATA")
            .map_err(|_| "APPDATA not found")?;
        Ok(PathBuf::from(app_data).join("com.iml1s.screeninu").join("translation_models"))
    }
    
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").map_err(|_| "HOME not found")?;
        Ok(PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join("com.iml1s.screeninu")
            .join("translation_models"))
    }
    
    #[cfg(target_os = "linux")]
    {
        let home = std::env::var("HOME").map_err(|_| "HOME not found")?;
        Ok(PathBuf::from(home)
            .join(".local")
            .join("share")
            .join("com.iml1s.screeninu")
            .join("translation_models"))
    }
}

/// Initialize or get the translator service
fn get_or_init_translator(model_name: &str) -> Result<(), String> {
    let mut guard = TRANSLATOR_INSTANCE.lock().map_err(|e| e.to_string())?;
    
    // Check if we need to reload
    if let Some(ref service) = *guard {
        if service.current_model.contains(model_name) {
            return Ok(());
        }
    }
    
    let models_dir = get_models_dir()?;
    let model_path = models_dir.join(model_name);
    
    if !model_path.exists() {
        return Err(format!("Model '{}' not found. Please download it first.", model_name));
    }
    
    let service = TranslatorService::new(model_path.to_str().unwrap())?;
    *guard = Some(service);
    
    Ok(())
}

// ========================================
// Tauri Commands
// ========================================

/// Translate text using offline model
#[tauri::command]
pub fn translate_offline(
    text: String,
    source_lang: String,
    target_lang: String,
) -> Result<String, String> {
    // Model naming: opus-mt-{src}-{tgt}
    let model_name = format!("opus-mt-{}-{}", source_lang, target_lang);
    
    get_or_init_translator(&model_name)?;
    
    let guard = TRANSLATOR_INSTANCE.lock().map_err(|e| e.to_string())?;
    let service = guard.as_ref().ok_or("Translator not initialized")?;
    
    service.translate(&text)
}

/// List available translation models
#[tauri::command]
pub fn list_translation_models() -> Result<Vec<TranslationModelInfo>, String> {
    let models_dir = get_models_dir()?;
    
    // Available models (can be downloaded)
    // Available models (can be downloaded)
    let available_models = vec![
        ("opus-mt-en-zh", "en", "zh", "https://huggingface.co/Xenova/opus-mt-en-zh/resolve/main"),
        ("opus-mt-zh-en", "zh", "en", "https://huggingface.co/Xenova/opus-mt-zh-en/resolve/main"),
        ("opus-mt-en-ja", "en", "ja", "https://huggingface.co/Xenova/opus-mt-en-ja/resolve/main"),
        ("opus-mt-ja-en", "ja", "en", "https://huggingface.co/Xenova/opus-mt-ja-en/resolve/main"),
        ("opus-mt-en-ko", "en", "ko", "https://huggingface.co/Xenova/opus-mt-en-ko/resolve/main"),
        ("opus-mt-ko-en", "ko", "en", "https://huggingface.co/Xenova/opus-mt-ko-en/resolve/main"),
    ];
    
    let mut models = Vec::new();
    
    for (name, src, tgt, url) in available_models {
        let model_path = models_dir.join(name);
        let installed = model_path.exists() && model_path.join("model.onnx").exists();
        let size = if installed {
            calculate_dir_size(&model_path).unwrap_or(0)
        } else {
            0
        };
        
        models.push(TranslationModelInfo {
            name: name.to_string(),
            source_lang: src.to_string(),
            target_lang: tgt.to_string(),
            size_bytes: size,
            installed,
            download_url: Some(url.to_string()),
        });
    }
    
    Ok(models)
}

/// Get status of a specific model
#[tauri::command]
pub fn get_translation_model_status(model_name: String) -> Result<TranslationModelInfo, String> {
    let models_dir = get_models_dir()?;
    let model_path = models_dir.join(&model_name);
    
    let installed = model_path.exists() && model_path.join("model.onnx").exists();
    let size = if installed {
        calculate_dir_size(&model_path).unwrap_or(0)
    } else {
        0
    };
    
    // Parse source/target from model name
    let parts: Vec<&str> = model_name.split('-').collect();
    let (src, tgt) = if parts.len() >= 4 {
        (parts[2].to_string(), parts[3].to_string())
    } else {
        ("?".to_string(), "?".to_string())
    };
    
    Ok(TranslationModelInfo {
        name: model_name,
        source_lang: src,
        target_lang: tgt,
        size_bytes: size,
        installed,
        download_url: None,
    })
}

/// Delete a translation model
#[tauri::command]
pub fn delete_translation_model(model_name: String) -> Result<(), String> {
    let models_dir = get_models_dir()?;
    let model_path = models_dir.join(&model_name);
    
    if model_path.exists() {
        std::fs::remove_dir_all(&model_path)
            .map_err(|e| format!("Failed to delete model: {}", e))?;
    }
    
    Ok(())
}

/// Download a translation model
#[tauri::command]
pub async fn download_translation_model(model_name: String) -> Result<(), String> {
    let models_dir = get_models_dir()?;
    let model_path = models_dir.join(&model_name);
    
    if model_path.exists() {
        return Ok(());
    }
    
    std::fs::create_dir_all(&model_path)
        .map_err(|e| format!("Failed to create directory: {}", e))?;
    
    let parts: Vec<&str> = model_name.split('-').collect();
    if parts.len() < 4 {
        return Err("Invalid model name".to_string());
    }
    let src = parts[2];
    let tgt = parts[3];
    
    // Xenova models base URL
    let base_url = format!("https://huggingface.co/Xenova/opus-mt-{}-{}/resolve/main", src, tgt);
    
    // Download tokenizer.json
    download_file(&format!("{}/tokenizer.json", base_url), &model_path.join("tokenizer.json")).await?;
    
    // Download model.onnx (try standard first, then quantized)
    let model_res = download_file(&format!("{}/onnx/model.onnx", base_url), &model_path.join("model.onnx")).await;
    
    if model_res.is_err() {
        // Try quantized
         download_file(&format!("{}/onnx/model_quantized.onnx", base_url), &model_path.join("model.onnx")).await?;
    }
    
    Ok(())
}

// ========================================
// Helper Functions
// ========================================

async fn download_file(url: &str, path: &PathBuf) -> Result<(), String> {
    use std::io::Write;
    
    let response = reqwest::get(url)
        .await
        .map_err(|e| format!("Failed to request {}: {}", url, e))?;
        
    if !response.status().is_success() {
        return Err(format!("Failed to download {}: Status {}", url, response.status()));
    }
    
    let content = response.bytes()
        .await
        .map_err(|e| format!("Failed to get bytes {}: {}", url, e))?;
        
    let mut file = std::fs::File::create(path)
        .map_err(|e| format!("Failed to create file {:?}: {}", path, e))?;
        
    file.write_all(&content)
        .map_err(|e| format!("Failed to write file {:?}: {}", path, e))?;
        
    Ok(())
}


/// Calculate total size of a directory
fn calculate_dir_size(path: &PathBuf) -> Result<u64, std::io::Error> {
    let mut size = 0;
    
    if path.is_dir() {
        for entry in std::fs::read_dir(path)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_dir() {
                size += calculate_dir_size(&path)?;
            } else {
                size += entry.metadata()?.len();
            }
        }
    }
    
    Ok(size)
}

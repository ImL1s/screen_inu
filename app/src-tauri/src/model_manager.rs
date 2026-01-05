// OCR Model (Language Pack) Management
// Download/manage Tesseract traineddata files from GitHub tessdata_fast

use std::fs;
use std::io::Write;
use std::path::PathBuf;

/// Model information
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ModelInfo {
    pub code: String,
    pub name: String,
    pub installed: bool,
    pub size_bytes: Option<u64>,
}

/// Available languages with their display names
const AVAILABLE_LANGUAGES: &[(&str, &str)] = &[
    ("afr", "Afrikaans"),
    ("amh", "Amharic"),
    ("ara", "Arabic"),
    ("asm", "Assamese"),
    ("aze", "Azerbaijani"),
    ("bel", "Belarusian"),
    ("ben", "Bengali"),
    ("bod", "Tibetan"),
    ("bos", "Bosnian"),
    ("bre", "Breton"),
    ("bul", "Bulgarian"),
    ("cat", "Catalan"),
    ("ceb", "Cebuano"),
    ("ces", "Czech"),
    ("chi_sim", "Chinese Simplified"),
    ("chi_tra", "Chinese Traditional"),
    ("chr", "Cherokee"),
    ("cos", "Corsican"),
    ("cym", "Welsh"),
    ("dan", "Danish"),
    ("deu", "German"),
    ("div", "Dhivehi"),
    ("dzo", "Dzongkha"),
    ("ell", "Greek"),
    ("eng", "English"),
    ("enm", "English Middle"),
    ("epo", "Esperanto"),
    ("est", "Estonian"),
    ("eus", "Basque"),
    ("fao", "Faroese"),
    ("fas", "Persian"),
    ("fil", "Filipino"),
    ("fin", "Finnish"),
    ("fra", "French"),
    ("frk", "German Fraktur"),
    ("frm", "French Middle"),
    ("fry", "Frisian"),
    ("gla", "Scottish Gaelic"),
    ("gle", "Irish"),
    ("glg", "Galician"),
    ("grc", "Greek Ancient"),
    ("guj", "Gujarati"),
    ("hat", "Haitian"),
    ("heb", "Hebrew"),
    ("hin", "Hindi"),
    ("hrv", "Croatian"),
    ("hun", "Hungarian"),
    ("hye", "Armenian"),
    ("iku", "Inuktitut"),
    ("ind", "Indonesian"),
    ("isl", "Icelandic"),
    ("ita", "Italian"),
    ("jav", "Javanese"),
    ("jpn", "Japanese"),
    ("kan", "Kannada"),
    ("kat", "Georgian"),
    ("kaz", "Kazakh"),
    ("khm", "Khmer"),
    ("kir", "Kyrgyz"),
    ("kor", "Korean"),
    ("lao", "Lao"),
    ("lat", "Latin"),
    ("lav", "Latvian"),
    ("lit", "Lithuanian"),
    ("ltz", "Luxembourgish"),
    ("mal", "Malayalam"),
    ("mar", "Marathi"),
    ("mkd", "Macedonian"),
    ("mlt", "Maltese"),
    ("mon", "Mongolian"),
    ("mri", "Maori"),
    ("msa", "Malay"),
    ("mya", "Myanmar"),
    ("nep", "Nepali"),
    ("nld", "Dutch"),
    ("nor", "Norwegian"),
    ("oci", "Occitan"),
    ("ori", "Oriya"),
    ("osd", "Orientation Script Detection"),
    ("pan", "Punjabi"),
    ("pol", "Polish"),
    ("por", "Portuguese"),
    ("pus", "Pashto"),
    ("que", "Quechua"),
    ("ron", "Romanian"),
    ("rus", "Russian"),
    ("san", "Sanskrit"),
    ("sin", "Sinhala"),
    ("slk", "Slovak"),
    ("slv", "Slovenian"),
    ("snd", "Sindhi"),
    ("spa", "Spanish"),
    ("sqi", "Albanian"),
    ("srp", "Serbian"),
    ("sun", "Sundanese"),
    ("swa", "Swahili"),
    ("swe", "Swedish"),
    ("syr", "Syriac"),
    ("tam", "Tamil"),
    ("tat", "Tatar"),
    ("tel", "Telugu"),
    ("tgk", "Tajik"),
    ("tha", "Thai"),
    ("tir", "Tigrinya"),
    ("ton", "Tonga"),
    ("tur", "Turkish"),
    ("uig", "Uyghur"),
    ("ukr", "Ukrainian"),
    ("urd", "Urdu"),
    ("uzb", "Uzbek"),
    ("vie", "Vietnamese"),
    ("yid", "Yiddish"),
    ("yor", "Yoruba"),
];

/// Get the tessdata directory path
fn get_tessdata_dir() -> Result<PathBuf, String> {
    crate::ocr::get_resource_dir().map(|p| p.join("tessdata"))
}

/// List all installed OCR models
pub fn list_installed_models() -> Result<Vec<ModelInfo>, String> {
    let tessdata_dir = get_tessdata_dir()?;
    let mut models = Vec::new();
    
    if !tessdata_dir.exists() {
        return Ok(models);
    }
    
    let entries = fs::read_dir(&tessdata_dir).map_err(|e| e.to_string())?;
    
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().map_or(false, |ext| ext == "traineddata") {
            if let Some(stem) = path.file_stem() {
                let code = stem.to_string_lossy().to_string();
                let name = AVAILABLE_LANGUAGES
                    .iter()
                    .find(|(c, _)| *c == code)
                    .map(|(_, n)| n.to_string())
                    .unwrap_or_else(|| code.clone());
                
                let size = fs::metadata(&path).map(|m| m.len()).ok();
                
                models.push(ModelInfo {
                    code,
                    name,
                    installed: true,
                    size_bytes: size,
                });
            }
        }
    }
    
    models.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(models)
}

/// List all available models (installed + not installed)
pub fn list_available_models() -> Result<Vec<ModelInfo>, String> {
    let installed = list_installed_models()?;
    let installed_codes: std::collections::HashSet<_> = 
        installed.iter().map(|m| m.code.as_str()).collect();
    
    let mut models: Vec<ModelInfo> = AVAILABLE_LANGUAGES
        .iter()
        .map(|(code, name)| {
            let is_installed = installed_codes.contains(code);
            let size = if is_installed {
                installed.iter()
                    .find(|m| m.code == *code)
                    .and_then(|m| m.size_bytes)
            } else {
                None
            };
            
            ModelInfo {
                code: code.to_string(),
                name: name.to_string(),
                installed: is_installed,
                size_bytes: size,
            }
        })
        .collect();
    
    models.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(models)
}

/// Download a model from GitHub tessdata_fast
pub fn download_model(lang: &str) -> Result<(), String> {
    let tessdata_dir = get_tessdata_dir()?;
    let target_path = tessdata_dir.join(format!("{}.traineddata", lang));
    
    // Check if already exists
    if target_path.exists() {
        return Err(format!("Model '{}' is already installed", lang));
    }
    
    // Download URL
    let url = format!(
        "https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/{}.traineddata",
        lang
    );
    
    // Download using reqwest (blocking)
    let response = reqwest::blocking::get(&url)
        .map_err(|e| format!("Failed to download: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!(
            "Failed to download model '{}': HTTP {}",
            lang,
            response.status()
        ));
    }
    
    let bytes = response.bytes().map_err(|e| format!("Failed to read response: {}", e))?;
    
    // Write to file
    let mut file = fs::File::create(&target_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;
    file.write_all(&bytes)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(())
}

/// Delete a model
pub fn delete_model(lang: &str) -> Result<(), String> {
    let tessdata_dir = get_tessdata_dir()?;
    let target_path = tessdata_dir.join(format!("{}.traineddata", lang));
    
    // Prevent deleting essential models
    let protected = ["eng", "osd"];
    if protected.contains(&lang) {
        return Err(format!("Cannot delete essential model '{}'", lang));
    }
    
    if !target_path.exists() {
        return Err(format!("Model '{}' is not installed", lang));
    }
    
    fs::remove_file(&target_path)
        .map_err(|e| format!("Failed to delete model: {}", e))?;
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_list_installed_models() {
        let result = list_installed_models();
        assert!(result.is_ok());
    }
    
    #[test]
    fn test_list_available_models() {
        let result = list_available_models();
        assert!(result.is_ok());
        let models = result.unwrap();
        assert!(!models.is_empty());
    }
}

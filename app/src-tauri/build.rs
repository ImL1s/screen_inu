use std::env;
use std::fs;
use std::path::Path;
use std::process::Command;

fn main() {
    // Linux-specific logic to bundle tesseract binary
    if env::var("CARGO_CFG_TARGET_OS").unwrap_or_default() == "linux" {
        let target_triple = env::var("TARGET").unwrap_or_default();
        let manifest_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
        let binaries_dir = Path::new(&manifest_dir).join("binaries");
        // Ensure binaries directory exists
        if !binaries_dir.exists() {
            fs::create_dir_all(&binaries_dir).expect("Failed to create binaries directory");
        }
        
        // Expected binary name by Tauri sidecar
        let tesseract_binary_name = format!("tesseract-{}", target_triple);
        let tesseract_binary_path = binaries_dir.join(&tesseract_binary_name);

        if !tesseract_binary_path.exists() {
            println!("cargo:warning=Tesseract sidecar binary not found at {}. Attempting to copy system binary...", tesseract_binary_path.display());

            // Try to find tesseract in system
            let output = Command::new("which")
                .arg("tesseract")
                .output()
                .expect("Failed to execute which command");

            if output.status.success() {
                let system_path_str = String::from_utf8(output.stdout).unwrap();
                let system_path = system_path_str.trim();
                
                if !system_path.is_empty() {
                    match fs::copy(system_path, &tesseract_binary_path) {
                        Ok(_) => println!("cargo:warning=Successfully bundled system tesseract from {}", system_path),
                        Err(e) => println!("cargo:warning=Failed to copy tesseract binary: {}", e),
                    }
                } else {
                    println!("cargo:warning=Could not find tesseract in system PATH. Please install tesseract-ocr package.");
                }
            } else {
                println!("cargo:warning=Could not execute 'which tesseract'. Please ensure tesseract-ocr is installed.");
            }
        }
    }

    tauri_build::build()
}

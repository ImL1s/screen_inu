<div align="center">
  <img src="assets/demo.png" alt="Screen Inu Demo" width="100%" />
  
  <h1 style="font-size: 3rem; margin-top: 1rem;">Screen Inu 🐕</h1>
  
  <p>
    <strong>Snap. Recognize. Copy.</strong> <br />
    A modern, cross-platform screenshot OCR tool powered by Rust & Tauri.
  </p>

  <p>
    <a href="README.md">English</a> •
    <a href="README_zh-TW.md">繁體中文</a> •
    <a href="README_zh-CN.md">简体中文</a> •
    <a href="README_ja.md">日本語</a> •
    <a href="README_ko.md">한국어</a>
  </p>

  <p>
    <a href="#features">Features</a> •
    <a href="#workflow">Workflow</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#getting-started">Getting Started</a>
  </p>

  <img src="https://img.shields.io/badge/Built%20With-Tauri%202.0-blue?style=for-the-badge&logo=tauri" />
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/Backend-Rust-orange?style=for-the-badge&logo=rust" />
  <img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey?style=for-the-badge" />
</div>

<br />

## ✨ Features

<div align="center">
  <img src="app/public/images/features.png" alt="Screen Inu Features" width="80%" />
</div>

*   **Global Shortcut** (`Ctrl/⌘ + Shift + X`): Snap from anywhere, anytime.
*   **Multi-Engine OCR**:
    *   **Auto-Smart Selection**: Automatically picks the best engine for the language (Windows OCR for CJK, Tesseract for others).
    *   **Windows Native OCR**: Integrated Windows Media OCR for superior accuracy in Chinese/Japanese/Korean.
    *   **Tesseract 5 (Bundled)**: No installation required! Optimized `tessdata_best` models included.
*   **Multi-language Support**: Fully localized interface in **English** and **Traditional Chinese (繁體中文)**.
*   **History Vault**: Automatically saves your recent snips and OCR results locally.
*   **Auto-Copy**: Optionally text to clipboard automatically after recognition.
*   **Dark/Light Theme**: Beautiful glassmorphism UI that adapts to your preference (Auto-saved).
*   **System Tray Integration**: Stays quietly in your menu bar, ready when you are.
*   **Modern UI**: Brutalist "Inu" themed design with smooth Framer Motion animations.
*   **Cross-Platform**: Built on Tauri, compatible with macOS, Windows, and Linux.

---

## 🚀 Workflow

<div align="center">
  <img src="app/public/images/flow.png" alt="Screen Inu Workflow" width="80%" />
</div>

1.  **Capture**: Trigger the global shortcut to freeze your screen.
2.  **Select**: Drag to select the area containing text.
3.  **Recognize**: The app automatically extracts text using the integrated OCR engine.
4.  **Copy**: Click to copy the result to your clipboard instantly.

---

## 🏗️ Architecture

<div align="center">
  <img src="app/public/images/architecture.png" alt="Screen Inu Architecture" width="60%" />
</div>

Screen Inu leverages the power of **Tauri 2.0** for a lightweight, secure, and performant desktop experience.
*   **Frontend**: React + TypeScript + TailwindCSS for a responsive and beautiful interface.
*   **Bridge**: Tauri's IPC allows seamless communication between the UI and system-level operations.
*   **Backend**: Rust handles heavy lifting—screen capturing (`xcap`), image processing, and OCR (`rusty-tesseract`).

---

## 🛠️ Getting Started

### Prerequisites
*   **Node.js** (v22+)
*   **Rust** (latest stable)
*   *(Optional)* **Tesseract OCR**: Only needed if you want to use system-installed Tesseract on Linux/macOS. 
    *   **Windows**: Bundled automatically! No install needed.
    *   **macOS/Linux**: The app tries to use bundled binary, but having system Tesseract is a good fallback.

<details>
<summary><strong>Manual Tesseract Installation (Optional)</strong></summary>

*   **macOS**: `brew install tesseract tesseract-lang`
*   **Linux**: `sudo apt install tesseract-ocr tesseract-ocr-chi-tra tesseract-ocr-jpn`
*   **Windows**: Not required (Bundled).

> **Note (Linux)**: The `build.rs` script automatically copies your system's `tesseract` binary to the required location during compilation.

</details>

<details>
<summary><strong>Linux Build Dependencies (Ubuntu/Debian)</strong></summary>

```bash
sudo apt update && sudo apt install -y \
    build-essential libwebkit2gtk-4.1-dev libayatana-appindicator3-dev \
    librsvg2-dev libxdo-dev libssl-dev libpipewire-0.3-dev libgbm-dev \
    clang curl wget file tesseract-ocr tesseract-ocr-chi-tra tesseract-ocr-jpn
```

</details>

---

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/ImL1s/screen_inu.git
    cd screen_inu
    ```

2.  **Install dependencies**
    ```bash
    cd app
    npm install
    ```

3.  **Run in Development Mode**
    ```bash
    npm run tauri dev
    ```

4.  **Build for Production**
    ```bash
    npm run tauri build
    ```
    *   **macOS**: `.app` and `.dmg` in `src-tauri/target/release/bundle/`
    *   **Windows**: `.msi` or `.exe` (NSIS) in `src-tauri/target/release/bundle/`
    *   **Linux**: `.AppImage` or `.deb` in `src-tauri/target/release/bundle/`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with ❤️ by ImL1s</sub>
</div>

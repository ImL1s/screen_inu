<div align="center">
  <img src="assets/demo.png" alt="Screen Inu Demo" width="100%" />
  
  <h1 style="font-size: 3rem; margin-top: 1rem;">Screen Inu 🐕</h1>
  
  <p>
    <strong>快照。識別。複製。</strong> <br />
    一款由 Rust 和 Tauri 驅動的現代跨平台螢幕截圖 OCR 工具。
  </p>

  <p>
    <a href="README.md">English</a> •
    <a href="README_zh-TW.md">繁體中文</a> •
    <a href="README_zh-CN.md">简体中文</a> •
    <a href="README_ja.md">日本語</a> •
    <a href="README_ko.md">한국어</a>
  </p>

  <p>
    <a href="#功能">功能</a> •
    <a href="#工作流程">工作流程</a> •
    <a href="#架構">架構</a> •
    <a href="#開始使用">開始使用</a>
  </p>

  <img src="https://img.shields.io/badge/Built%20With-Tauri%202.0-blue?style=for-the-badge&logo=tauri" />
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/Backend-Rust-orange?style=for-the-badge&logo=rust" />
  <img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey?style=for-the-badge" />
</div>

<br />

## ✨ 功能

<div align="center">
  <img src="app/public/images/features.png" alt="Screen Inu Features" width="80%" />
</div>

*   **全局快捷鍵** (`Ctrl/⌘ + Shift + X`): 隨時隨地進行截圖。
*   **多語言支援**: 完整支援 **英文** 和 **繁體中文** 介面。
*   **高精度 OCR**: 由 Tesseract 引擎驅動，專精於中英文識別。
*   **歷史金庫**: 自動將您最近的截圖和 OCR 結果儲存在本地。
*   **自動複製**: 識別完成後可選擇自動將文字複製到剪貼簿。
*   **深色/淺色主題**: 根據您的喜好自動適應的精美玻璃擬態 UI (自動儲存)。
*   **系統托盤整合**: 安靜地常駐在選單列，隨時待命。
*   **現代 UI**: 帶有流暢 Framer Motion 動畫的 Brutalist "Inu" 主題設計。
*   **跨平台**: 基於 Tauri 構建，相容 macOS、Windows 和 Linux。

---

## 🚀 工作流程

<div align="center">
  <img src="app/public/images/flow.png" alt="Screen Inu Workflow" width="80%" />
</div>

1.  **截取**: 觸發全局快捷鍵以凍結螢幕。
2.  **選擇**: 拖曳以選擇包含文字的區域。
3.  **識別**: 應用程式使用整合的 OCR 引擎自動提取文字。
4.  **複製**: 點擊即可立即將結果複製到剪貼簿。

---

## 🏗️ 架構

<div align="center">
  <img src="app/public/images/architecture.png" alt="Screen Inu Architecture" width="60%" />
</div>

Screen Inu 利用 **Tauri 2.0** 的強大功能，提供輕量、安全且高效能的桌面體驗。
*   **前端**: React + TypeScript + TailwindCSS 打造響應式且美觀的介面。
*   **橋接**: Tauri 的 IPC 允許 UI 與系統層級操作之間的無縫通訊。
*   **後端**: Rust 處理繁重工作—螢幕截取 (`xcap`)、影像處理和 OCR (`rusty-tesseract`)。

---

## 🛠️ 開始使用

### 先決條件
*   **Node.js** (v18+)
*   **Rust** (最新穩定版)
*   **Tesseract OCR** (需安裝語言包)

#### 各平台 Tesseract 安裝指南

<details>
<summary><strong>macOS</strong></summary>

```bash
brew install tesseract tesseract-lang
```
在 **系統設定 > 隱私權與安全性 > 螢幕錄製** 中授予螢幕錄製權限。
</details>

<details>
<summary><strong>Windows</strong></summary>

1. 從 [UB Mannheim](https://github.com/UB-Mannheim/tesseract/wiki) 下載安裝程式。
2. 安裝過程中，選擇 **Additional language data** (例如：Chinese Traditional, Japanese)。
3. 將 Tesseract 加入您的 `PATH` 環境變數 (安裝程式通常會提供此選項)。
4. 驗證：`tesseract --version`
</details>

<details>
<summary><strong>Linux (Debian/Ubuntu)</strong></summary>

```bash
sudo apt update
sudo apt install tesseract-ocr tesseract-ocr-chi-tra tesseract-ocr-jpn
```
其他發行版請參考您的套件管理器。
</details>

---

### 安裝

1.  **複製儲存庫**
    ```bash
    git clone https://github.com/ImL1s/screen_inu.git
    cd screen_inu
    ```

2.  **安裝依賴**
    ```bash
    cd app
    npm install
    ```

3.  **在開發模式下運行**
    ```bash
    npm run tauri dev
    ```

4.  **構建生產版本**
    ```bash
    npm run tauri build
    ```
    *   **macOS**: `.app` 和 `.dmg` 位於 `src-tauri/target/release/bundle/`
    *   **Windows**: `.msi` 或 `.exe` (NSIS) 位於 `src-tauri/target/release/bundle/`
    *   **Linux**: `.AppImage` 或 `.deb` 位於 `src-tauri/target/release/bundle/`

## 📄 授權

本專案採用 MIT 授權條款 - 詳情請參閱 [LICENSE](LICENSE) 文件。

---

<div align="center">
  <sub>Built with ❤️ by ImL1s</sub>
</div>

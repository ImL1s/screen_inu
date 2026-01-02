<div align="center">
  <img src="assets/demo.png" alt="Screen Inu Demo" width="100%" />
  
  <h1 style="font-size: 3rem; margin-top: 1rem;">Screen Inu 🐕</h1>
  
  <p>
    <strong>快照。识别。复制。</strong> <br />
    一款由 Rust 和 Tauri 驱动的现代跨平台屏幕截图 OCR 工具。
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
    <a href="#架构">架构</a> •
    <a href="#开始使用">开始使用</a>
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

*   **全局快捷键** (`Ctrl/⌘ + Shift + X`): 随时随地进行截屏。
*   **多语言支持**: 完整支持 **英文** 和 **繁体中文** 界面。
*   **高精度 OCR**: 由 Tesseract 引擎驱动，专精于中英文识别。
*   **历史金库**: 自动将您最近的截图和 OCR 结果保存在本地。
*   **自动复制**: 识别完成后可选择自动将文本复制到剪贴板。
*   **深色/浅色主题**: 根据您的喜好自动适应的精美玻璃拟态 UI (自动保存)。
*   **系统托盘集成**: 安静地常驻在菜单栏，随时待命。
*   **现代 UI**: 带有流畅 Framer Motion 动画的 Brutalist "Inu" 主题设计。
*   **跨平台**: 基于 Tauri 构建，兼容 macOS、Windows 和 Linux。

---

## 🚀 工作流程

<div align="center">
  <img src="app/public/images/flow.png" alt="Screen Inu Workflow" width="80%" />
</div>

1.  **截取**: 触发全局快捷键以冻结屏幕。
2.  **选择**: 拖曳以选择包含文本的区域。
3.  **识别**: 应用程序使用集成的 OCR 引擎自动提取文本。
4.  **复制**: 点击即可立即将结果复制到剪贴板。

---

## 🏗️ 架构

<div align="center">
  <img src="app/public/images/architecture.png" alt="Screen Inu Architecture" width="60%" />
</div>

Screen Inu 利用 **Tauri 2.0** 的强大功能，提供轻量、安全且高性能的桌面体验。
*   **前端**: React + TypeScript + TailwindCSS 打造响应式且美观的界面。
*   **桥接**: Tauri 的 IPC 允许 UI 与系统层级操作之间的无缝通讯。
*   **后端**: Rust 处理繁重工作—屏幕截取 (`xcap`)、图像处理和 OCR (`rusty-tesseract`)。

---

## 🛠️ 开始使用

### 先决条件
*   **Node.js** (v18+)
*   **Rust** (最新稳定版)
*   **Tesseract OCR** (需安装语言包)

#### 各平台 Tesseract 安装指南

<details>
<summary><strong>macOS</strong></summary>

```bash
brew install tesseract tesseract-lang
```
在 **系统设置 > 隐私与安全性 > 屏幕录制** 中授予屏幕录制权限。
</details>

<details>
<summary><strong>Windows</strong></summary>

1. 从 [UB Mannheim](https://github.com/UB-Mannheim/tesseract/wiki) 下载安装程序。
2. 安装过程中，选择 **Additional language data** (例如：Chinese Traditional, Japanese)。
3. 将 Tesseract 加入您的 `PATH` 环境变量 (安装程序通常会提供此选项)。
4. 验证：`tesseract --version`
</details>

<details>
<summary><strong>Linux (Debian/Ubuntu)</strong></summary>

```bash
sudo apt update
sudo apt install tesseract-ocr tesseract-ocr-chi-tra tesseract-ocr-jpn
```
其他发行版请参考您的包管理器。
</details>

---

### 安装

1.  **克隆仓库**
    ```bash
    git clone https://github.com/ImL1s/screen_inu.git
    cd screen_inu
    ```

2.  **安装依赖**
    ```bash
    cd app
    npm install
    ```

3.  **在开发模式下运行**
    ```bash
    npm run tauri dev
    ```

4.  **构建生产版本**
    ```bash
    npm run tauri build
    ```
    *   **macOS**: `.app` 和 `.dmg` 位于 `src-tauri/target/release/bundle/`
    *   **Windows**: `.msi` or `.exe` (NSIS) 位于 `src-tauri/target/release/bundle/`
    *   **Linux**: `.AppImage` or `.deb` 位于 `src-tauri/target/release/bundle/`

## 📄 许可

本专案采用 MIT 许可条款 - 详情请参阅 [LICENSE](LICENSE) 文件。

---

<div align="center">
  <sub>Built with ❤️ by ImL1s</sub>
</div>

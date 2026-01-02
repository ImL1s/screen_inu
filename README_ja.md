<div align="center">
  <img src="assets/demo.png" alt="Screen Inu Demo" width="100%" />
  
  <h1 style="font-size: 3rem; margin-top: 1rem;">Screen Inu 🐕</h1>
  
  <p>
    <strong>パシャッ。認識。コピー。</strong> <br />
    Rust と Tauri を搭載した現代的なクロスプラットフォーム・スクリーンショット OCR ツール。
  </p>

  <p>
    <a href="README.md">English</a> •
    <a href="README_zh-TW.md">繁體中文</a> •
    <a href="README_zh-CN.md">简体中文</a> •
    <a href="README_ja.md">日本語</a> •
    <a href="README_ko.md">한국어</a>
  </p>

  <p>
    <a href="#機能">機能</a> •
    <a href="#ワークフロー">ワークフロー</a> •
    <a href="#アーキテクチャ">アーキテクチャ</a> •
    <a href="#はじめに">はじめに</a>
  </p>

  <img src="https://img.shields.io/badge/Built%20With-Tauri%202.0-blue?style=for-the-badge&logo=tauri" />
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/Backend-Rust-orange?style=for-the-badge&logo=rust" />
  <img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey?style=for-the-badge" />
</div>

<br />

## ✨ 機能

<div align="center">
  <img src="app/public/images/features.png" alt="Screen Inu Features" width="80%" />
</div>

*   **グローバルショートカット** (`Ctrl/⌘ + Shift + X`): いつでもどこでもスクリーンショット。
*   **多言語サポート**: **英語**と**繁体字中国語**のインターフェースに完全対応。
*   **高精度 OCR**: Tesseract エンジンを搭載し、英語と中国語に特化。
*   **履歴保管庫**: 最近の切り取りと OCR 結果をローカルに自動保存。
*   **自動コピー**: 認識後にテキストをクリップボードに自動コピーするオプション。
*   **ダーク/ライトテーマ**: 好みに合わせて自動調整される美しいグラスモーフィズム UI (自動保存)。
*   **システムトレイ統合**: メニューバーに静かに常駐し、いつでも使用可能。
*   **モダン UI**: スムーズな Framer Motion アニメーションを備えたブルータリスト "Inu" テーマのデザイン。
*   **クロスプラットフォーム**: Tauri ベースで構築され、macOS、Windows、Linux と互換性があります。

---

## 🚀 ワークフロー

<div align="center">
  <img src="app/public/images/flow.png" alt="Screen Inu Workflow" width="80%" />
</div>

1.  **キャプチャ**: グローバルショートカットをトリガーして画面をフリーズします。
2.  **選択**: テキストを含む領域をドラッグして選択します。
3.  **認識**: アプリが統合された OCR エンジンを使用してテキストを自動的に抽出します。
4.  **コピー**: クリックすると結果が即座にクリップボードにコピーされます。

---

## 🏗️ アーキテクチャ

<div align="center">
  <img src="app/public/images/architecture.png" alt="Screen Inu Architecture" width="60%" />
</div>

Screen Inu は **Tauri 2.0** のパワーを活用し、軽量で安全、かつ高性能なデスクトップ体験を提供します。
*   **フロントエンド**: React + TypeScript + TailwindCSS でレスポンシブで美しいインターフェースを構築。
*   **ブリッジ**: Tauri の IPC により、UI とシステムレベルの操作間のシームレスな通信が可能。
*   **バックエンド**: Rust が重労働—画面キャプチャ (`xcap`)、画像処理、OCR (`rusty-tesseract`)—を処理します。

---

## 🛠️ はじめに

### 前提条件
*   **Node.js** (v18+)
*   **Rust** (最新の安定版)
*   **Tesseract OCR** (言語パック付き)

#### プラットフォーム別 Tesseract インストールガイド

<details>
<summary><strong>macOS</strong></summary>

```bash
brew install tesseract tesseract-lang
```
**システム設定 > プライバシーとセキュリティ > 画面収録** で画面収録の許可を与えてください。
</details>

<details>
<summary><strong>Windows</strong></summary>

1. [UB Mannheim](https://github.com/UB-Mannheim/tesseract/wiki) からインストーラーをダウンロードします。
2. インストール中に **Additional language data** (例: Chinese Traditional, Japanese) を選択します。
3. Tesseract を `PATH` 環境変数に追加します (インストーラーが通常このオプションを提供します)。
4. 確認: `tesseract --version`
</details>

<details>
<summary><strong>Linux (Debian/Ubuntu)</strong></summary>

```bash
sudo apt update
sudo apt install tesseract-ocr tesseract-ocr-chi-tra tesseract-ocr-jpn
```
他のディストリビューションについては、パッケージマネージャーを参照してください。
</details>

---

### インストール

1.  **リポジトリのクローン**
    ```bash
    git clone https://github.com/ImL1s/screen_inu.git
    cd screen_inu
    ```

2.  **依存関係のインストール**
    ```bash
    cd app
    npm install
    ```

3.  **開発モードで実行**
    ```bash
    npm run tauri dev
    ```

4.  **本番用ビルド**
    ```bash
    npm run tauri build
    ```
    *   **macOS**: `.app` と `.dmg` は `src-tauri/target/release/bundle/` に
    *   **Windows**: `.msi` または `.exe` (NSIS) は `src-tauri/target/release/bundle/` に
    *   **Linux**: `.AppImage` または `.deb` は `src-tauri/target/release/bundle/` に

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下でライセンスされています - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

---

<div align="center">
  <sub>Built with ❤️ by ImL1s</sub>
</div>

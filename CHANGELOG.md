# Changelog

All notable changes to Screen Inu will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Development roadmap for future improvements

## [0.2.3] - 2026-01-04

### Added
- **Offline OCR Model Management**: Dedicated UI to browse, download, and manage Tesseract language packs (`.traineddata`) for offline use.
- **Download Manager**: Real-time progress tracking for model downloads from `tesseract-ocr/tessdata_fast`.
- **Search**: Ability to search for available languages in the Model Manager.

### Fixed
- **CI/CD Reliability**: Implemented Rust crate caching (`rust-cache`) and optimized E2E build timeouts to fix persistent CI failures.
- **Release Build (macOS)**: Restored `bundle.targets` to `"all"` to ensure DMG/APP bundles are generated on macOS, fixing v0.2.2 build failure.
- **Release Build (macOS/Windows)**: Optimized sidecar preparation to ensure valid Mach-O binaries for codesigning.
- **E2E Tests**: Fixed locator timeout issues by aligning test configuration with CI performance constraints.

---


## [0.1.2] - 2026-01-04

### Added
- **Custom Keyboard Shortcuts**: Users can now configure their own global shortcut for screen capture
- **OCR Translation**: Translate recognized text to multiple languages (English, Chinese, Japanese, Korean, etc.)
- **Auto-Translate Toggle**: Option to automatically translate text after OCR
- **Target Language Selector**: Choose your preferred translation target language

### Fixed
- E2E test failures on Linux CI (WebDriver capability mismatch)
- Rust compilation issues with `libspa` on Ubuntu 24.04
- Missing `libgbm-dev` dependency in CI workflow

### Changed
- Upgraded `xcap` dependency to 0.8.1 for better Linux compatibility
- Improved `tauri-driver` installation in CI with `--locked` flag

---

## [0.1.1] - 2026-01-03

### Added
- Multi-language UI support (English, Traditional Chinese)
- Dark/Light theme with auto-save preference
- Sound effects toggle
- Silent mode (auto-hide window after OCR)
- Direct snip mode (skip full screenshot preview)

### Fixed
- Icon display issues on Windows taskbar
- System tray menu consistency across platforms

---

## [0.1.0] - 2026-01-02

### Added
- Initial release of Screen Inu 🐕
- Global shortcut for screen capture (`Ctrl/Cmd + Shift + X`)
- Multi-engine OCR support:
  - Tesseract 5 (bundled for Windows)
  - Windows Native OCR (Media OCR)
  - Auto-smart selection based on detected language
- QR code scanning
- History vault for recent OCR results
- Auto-copy to clipboard option
- System tray integration
- Cross-platform support (Windows, macOS, Linux)
- Auto-updater via Tauri plugin

---

[Unreleased]: https://github.com/ImL1s/screen_inu/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/ImL1s/screen_inu/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/ImL1s/screen_inu/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/ImL1s/screen_inu/releases/tag/v0.1.0

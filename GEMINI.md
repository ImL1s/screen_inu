# Screen Inu - Gemini AI Development Guide

Modern cross-platform screenshot OCR tool powered by Rust & Tauri.

## Project Overview

**Screen Inu** 🐕 is a desktop application that enables users to capture screen regions and extract text using OCR (Optical Character Recognition).

- **Core Technology**: Tauri 2.0 (Rust backend + Web frontend)
- **Frontend**: React 19 + TypeScript + TailwindCSS 4 + Framer Motion
- **Backend**: Rust with `xcap` (screen capture) and `rusty-tesseract` (OCR engine)
- **Platforms**: macOS, Windows, Linux

## Architecture

```
app/
├── src/                    # React frontend
│   ├── App.tsx            # Main application component
│   ├── components/        # React components (SnippingOverlay)
│   └── utils/             # Utilities (notifications, history)
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── lib.rs         # Tauri commands (OCR, screen capture, QR scan)
│   │   ├── tray.rs        # System tray integration
│   │   └── main.rs        # Entry point
│   └── tauri.conf.json    # Tauri configuration
└── package.json           # Frontend dependencies
```

## Key Features

1. **Global Shortcut** (`Ctrl/⌘ + Shift + X`) - Trigger screen capture from anywhere
2. **OCR Engine** - Tesseract-based with multi-language support (eng, chi_tra, jpn, etc.)
3. **QR Code Scanning** - Built-in QR code detection via `rqrr`
4. **Auto-Copy** - Option to automatically copy recognized text to clipboard
5. **System Tray** - Runs in background with tray menu
6. **Theme Support** - Dark/Light mode with glassmorphism UI

## Development Commands

```bash
cd app
npm install          # Install dependencies
npm run tauri dev    # Development mode
npm run tauri build  # Production build
```

## Rust Backend Commands

- `capture_full_screen()` - Captures primary monitor as base64 PNG
- `perform_ocr(base64_image, langs)` - Extracts text from image
- `scan_qr(base64_image)` - Detects and decodes QR codes

## Dependencies

**Frontend**: React, Framer Motion, Lucide React, Tauri plugins (dialog, global-shortcut, updater)  
**Backend**: tauri, xcap, rusty-tesseract, image, base64, rqrr

## Prerequisites

- Node.js v18+
- Rust (latest stable)
- Tesseract OCR with language packs installed on system

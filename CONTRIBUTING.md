# Contributing to Screen Inu 🐕

Thank you for your interest in contributing to Screen Inu! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Code Style](#code-style)
- [Reporting Issues](#reporting-issues)

---

## Code of Conduct

Please be respectful and constructive in all interactions. We welcome contributors of all backgrounds and experience levels.

---

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/screen_inu.git
   cd screen_inu
   ```

3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/ImL1s/screen_inu.git
   ```

---

## Development Setup

### Prerequisites

- **Node.js** v22 or higher
- **Rust** (latest stable via [rustup](https://rustup.rs/))
- **Platform-specific dependencies**:
  - **Windows**: No additional setup required
  - **macOS**: `brew install tesseract tesseract-lang` (optional)
  - **Linux**: 
    ```bash
    sudo apt install -y build-essential libwebkit2gtk-4.1-dev libayatana-appindicator3-dev \
        librsvg2-dev libxdo-dev libssl-dev libpipewire-0.3-dev libgbm-dev clang \
        tesseract-ocr tesseract-ocr-chi-tra tesseract-ocr-jpn
    ```

### Installation

```bash
cd app
npm install
npm run tauri dev
```

---

## Making Changes

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our [code style](#code-style)

3. **Test your changes**:
   ```bash
   # Frontend tests
   npm run test
   
   # E2E tests (requires tauri-driver)
   cd e2e && npm test
   
   # Rust tests
   cd src-tauri && cargo test
   ```

4. **Commit with a descriptive message**:
   ```bash
   git commit -m "feat: add new feature description"
   ```

   We follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

---

## Submitting a Pull Request

1. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** on GitHub against the `develop` branch

3. **Fill out the PR template** with:
   - Description of changes
   - Related issue numbers
   - Screenshots (for UI changes)
   - Testing steps

4. **Wait for CI checks** to pass

5. **Address review feedback** if any

---

## Code Style

### TypeScript/React (Frontend)

- Use functional components with hooks
- Follow existing naming conventions
- Use `useTranslation` for all user-facing strings
- Add TypeScript types for props and state

### Rust (Backend)

- Run `cargo fmt` before committing
- Run `cargo clippy` and address warnings
- Document public functions with `///` comments

### General

- Keep files focused and reasonably sized
- Add comments for complex logic
- Update documentation when adding features

---

## Reporting Issues

When reporting bugs, please include:

1. **Environment**: OS, version, architecture
2. **Steps to reproduce**: Clear, numbered steps
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Screenshots/logs**: If applicable

---

## Questions?

Feel free to open a [Discussion](https://github.com/ImL1s/screen_inu/discussions) for questions or ideas.

Thank you for contributing! 🐕

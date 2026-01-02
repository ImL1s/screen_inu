<div align="center">
  <img src="assets/demo.png" alt="Screen Inu Demo" width="100%" />
  
  <h1 style="font-size: 3rem; margin-top: 1rem;">Screen Inu 🐕</h1>
  
  <p>
    <strong>캡처. 인식. 복사.</strong> <br />
    Rust와 Tauri로 구동되는 현대적인 크로스 플랫폼 스크린샷 OCR 도구입니다.
  </p>

  <p>
    <a href="README.md">English</a> •
    <a href="README_zh-TW.md">繁體中文</a> •
    <a href="README_zh-CN.md">简体中文</a> •
    <a href="README_ja.md">日本語</a> •
    <a href="README_ko.md">한국어</a>
  </p>

  <p>
    <a href="#기능">기능</a> •
    <a href="#워크플로우">워크플로우</a> •
    <a href="#아키텍처">아키텍처</a> •
    <a href="#시작하기">시작하기</a>
  </p>

  <img src="https://img.shields.io/badge/Built%20With-Tauri%202.0-blue?style=for-the-badge&logo=tauri" />
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react" />
  <img src="https://img.shields.io/badge/Backend-Rust-orange?style=for-the-badge&logo=rust" />
  <img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey?style=for-the-badge" />
</div>

<br />

## ✨ 기능

<div align="center">
  <img src="app/public/images/features.png" alt="Screen Inu Features" width="80%" />
</div>

*   **전역 단축키** (`Ctrl/⌘ + Shift + X`): 언제 어디서나 스크린샷을 찍을 수 있습니다.
*   **다국어 지원**: **영어** 및 **중국어 번체** 인터페이스를 완벽하게 지원합니다.
*   **고정밀 OCR**: 영어와 중국어 인식에 특화된 Tesseract 엔진으로 구동됩니다.
*   **히스토리 저장소**: 최근 캡처 및 OCR 결과를 로컬에 자동으로 저장합니다.
*   **자동 복사**: 인식 완료 후 텍스트를 클립보드에 자동으로 복사하는 옵션.
*   **다크/라이트 테마**: 선호도에 따라 자동으로 조정되는 아름다운 글래스모피즘 UI (자동 저장).
*   **시스템 트레이 통합**: 메뉴 팩에 조용히 상주하여 언제든지 사용할 수 있습니다.
*   **현대적인 UI**: 부드러운 Framer Motion 애니메이션이 적용된 Brutalist "Inu" 테마 디자인.
*   **크로스 플랫폼**: Tauri 기반으로 제작되어 macOS, Windows 및 Linux와 호환됩니다.

---

## 🚀 워크플로우

<div align="center">
  <img src="app/public/images/flow.png" alt="Screen Inu Workflow" width="80%" />
</div>

1.  **캡처**: 전역 단축키를 실행하여 화면을 고정합니다.
2.  **선택**: 텍스트가 포함된 영역을 드래그하여 선택합니다.
3.  **인식**: 앱이 통합된 OCR 엔진을 사용하여 텍스트를 자동으로 추출합니다.
4.  **복사**: 클릭하면 결과가 즉시 클립보드에 복사됩니다.

---

## 🏗️ 아키텍처

<div align="center">
  <img src="app/public/images/architecture.png" alt="Screen Inu Architecture" width="60%" />
</div>

Screen Inu는 **Tauri 2.0**의 강력한 기능을 활용하여 가볍고 안전하며 고성능의 데스크톱 경험을 제공합니다.
*   **프론트엔드**: React + TypeScript + TailwindCSS로 반응형이고 아름다운 인터페이스 구축.
*   **브리지**: Tauri의 IPC를 통해 UI와 시스템 수준 작업 간의 원활한 통신 가능.
*   **백엔드**: Rust가 화면 캡처(`xcap`), 이미지 처리 및 OCR(`rusty-tesseract`)과 같은 무거운 작업을 처리합니다.

---

## 🛠️ 시작하기

### 전제 조건
*   **Node.js** (v18+)
*   **Rust** (최신 안정 버전)
*   **Tesseract OCR** (언어 팩 포함)

#### 플랫폼별 Tesseract 설치 가이드

<details>
<summary><strong>macOS</strong></summary>

```bash
brew install tesseract tesseract-lang
```
**시스템 설정 > 개인정보 보호 및 보안 > 화면 기록**에서 화면 기록 권한을 부여하세요.
</details>

<details>
<summary><strong>Windows</strong></summary>

1. [UB Mannheim](https://github.com/UB-Mannheim/tesseract/wiki)에서 설치 프로그램을 다운로드합니다.
2. 설치 중 **Additional language data**(예: Chinese Traditional, Japanese)를 선택합니다.
3. Tesseract를 `PATH` 환경 변수에 추가합니다(설치 프로그램에서 보통 이 옵션을 제공함).
4. 확인: `tesseract --version`
</details>

<details>
<summary><strong>Linux (Debian/Ubuntu)</strong></summary>

```bash
sudo apt update
sudo apt install tesseract-ocr tesseract-ocr-chi-tra tesseract-ocr-jpn
```
다른 배포판의 경우 패키지 관리자를 참조하세요.
</details>

---

### 설치

1.  **저장소 복제**
    ```bash
    git clone https://github.com/ImL1s/screen_inu.git
    cd screen_inu
    ```

2.  **의존성 설치**
    ```bash
    cd app
    npm install
    ```

3.  **개발 모드에서 실행**
    ```bash
    npm run tauri dev
    ```

4.  **프로덕션 빌드**
    ```bash
    npm run tauri build
    ```
    *   **macOS**: `.app` 및 `.dmg`는 `src-tauri/target/release/bundle/`에 위치
    *   **Windows**: `.msi` 또는 `.exe` (NSIS)는 `src-tauri/target/release/bundle/`에 위치
    *   **Linux**: `.AppImage` 또는 `.deb`는 `src-tauri/target/release/bundle/`에 위치

## 📄 라이선스

이 프로젝트는 MIT 라이선스에 따라 라이선스가 부여됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

---

<div align="center">
  <sub>Built with ❤️ by ImL1s</sub>
</div>

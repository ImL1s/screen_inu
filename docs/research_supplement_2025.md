# 跨平台截圖 OCR 桌面應用 - 2025 補充研究報告

> 本報告補充 `init.md` 的框架對比分析，加入 2024-2025 最新動態與開源專案參考。

---

## 一、最新框架動態更新

### 1. Tauri 2.0 (2024年10月正式發布)

**重大更新：**
- 正式支援行動平台 (iOS、Android)
- 全新插件系統，可用 Rust、Kotlin、Swift 處理命令
- `tauri-plugin-screenshots` 已支援 Tauri v2，基於 `xcap` 庫實現截屏

**截圖 OCR 整合方案：**
```
1. 使用 tauri-plugin-screenshots 捕獲螢幕區域
2. 後端 Rust 整合 OCR 引擎 (如 tesseract-rs 或調用 PaddleOCR)
3. 開發自訂插件協調截圖→OCR 流程
```

**參考專案：** Stirling-PDF (Tauri 專案，包含 OCR 功能)

---

### 2. Electron vs Tauri 效能對比 (2024)

| 指標 | Electron | Tauri |
|------|----------|-------|
| 安裝包大小 | >100 MB | <10 MB |
| 記憶體佔用 (閒置) | 200-300 MB | 30-40 MB |
| 啟動時間 | 1-2 秒 | <0.5 秒 |
| 安全性 | 一般 | 更佳 (Rust 後端) |

**截圖功能對比：**
- Electron: 內建 `desktopCapturer`，開箱即用但有低畫質/幀率問題報告
- Tauri: 需要插件支援，但底層效能更優

---

### 3. Flutter Desktop OCR (2024)

**可用插件：**
- `screen_capturer` - 桌面端螢幕截圖
- `flutter_screen_capture` - 全屏/區域截圖
- `google_mlkit_text_recognition` - OCR 識別 (主要支援移動端)

**限制：**
- 桌面端 on-device OCR 支援有限
- 建議方案：整合 Tesseract 或使用原生 SDK

---

## 二、OCR 引擎最新對比

### 推薦排名 (2024-2025)

| 排名 | 引擎 | 優勢 | 中日韓支援 | 授權 |
|------|------|------|------------|------|
| ⭐1 | **PaddleOCR** | 效能最佳、準確度高、支援109語言 | 優秀 | Apache 2.0 |
| ⭐2 | **EasyOCR** | 易用、80+語言、Python 整合方便 | 良好 | Apache 2.0 |
| 3 | Tesseract | 100+語言、穩定成熟 | 一般 | Apache 2.0 |
| 4 | 雲端服務 | 準確度最高 | 優秀 | 收費 |

### PaddleOCR 最新進展

**PP-OCRv5 (2025)：**
- 整體識別準確度提升 13% (相較 v4)
- 單一模型統一支援：簡體中文、繁體中文、中文拼音、英文、日文
- 多語言識別支援 109 種語言
- 更佳的複雜布局處理 (表格、公式、圖表)

---

## 三、開源專案參考庫

### 🔥 熱門專案推薦

#### 1. Umi-OCR (⭐強烈推薦)
- **技術棧：** Python + PaddleOCR
- **特點：**
  - 完全離線、本地處理
  - 截圖 OCR + 批量圖片識別
  - PDF OCR 支援
  - 支援 80+ 語言
  - 免安裝、解壓即用
- **平台：** Windows (主要)
- **GitHub：** hiroi-sora/Umi-OCR

#### 2. NormCap
- **特點：** OCR 截圖工具，免費開源
- **平台：** 跨平台

#### 3. Capture2Text
- **特點：** 快速區域截圖 OCR，90+ 語言
- **平台：** Windows

#### 4. TRex (macOS)
- **特點：**
  - 菜單列 OCR 工具
  - 支援 Apple Vision + Tesseract 雙引擎
  - 100+ 語言
- **平台：** macOS
- **開源：** ✅

#### 5. VIZ (macOS)
- **特點：** 輕量級菜單列 OCR，18 語言
- **平台：** macOS
- **開源：** ✅

#### 6. macOCR
- **特點：** 命令行 OCR，可整合 Shortcuts
- **平台：** macOS
- **GitHub：** schappim/macOCR

---

## 四、技術選型建議

### 場景一：快速開發 + 跨平台優先

**推薦：Electron + Tesseract.js**
```
優點：
✅ 開發速度快、生態豐富
✅ 截圖/全局熱鍵開箱即用
✅ 大量現成範例

缺點：
❌ 體積大 (>100MB)
❌ 記憶體佔用高
```

### 場景二：輕量 + 高效能

**推薦：Tauri 2.0 + Rust OCR 整合**
```
優點：
✅ 超小體積 (<10MB)
✅ 低記憶體佔用
✅ Rust 後端高效能 OCR 處理
✅ 支援行動端擴展

缺點：
❌ 需要整合插件
❌ 學習曲線較陡
```

### 場景三：專注 macOS

**推薦：Swift + Apple Vision Framework**
```
優點：
✅ 原生整合、系統級體驗
✅ Apple Vision OCR 準確度高
✅ 支援 Live Text 等系統功能

缺點：
❌ 僅 macOS
```

### 場景四：中日韓多語言優先

**推薦：任意框架 + PaddleOCR**
```
優點：
✅ 中日韓識別最佳
✅ 離線處理
✅ 持續更新 (PP-OCRv5)

整合方式：
- Python: 直接調用
- Node.js: 子進程調用
- Rust: FFI 綁定或 HTTP 服務
```

---

## 五、競品分析

### 商業軟體
| 產品 | 平台 | 特點 | 定價 |
|------|------|------|------|
| TextSniper | macOS | 系統級整合、易用 | 付費 |
| Easy Screen OCR | Win/Mac | 多語言、雲端 OCR | 付費 |
| OwlOCR | macOS | 菜單列快速 OCR | 免費/Pro |

### 開源方案對比

| 專案 | 框架 | 截圖 | OCR 引擎 | 平台 |
|------|------|------|----------|------|
| Biyi | Flutter | ✅ | Tesseract | 全平台 |
| S-Crop | Electron | ✅ | Tesseract.js | Windows |
| Montélimar (Silo) | Tauri | ✅ | Python OCR | macOS |
| Umi-OCR | Python/Qt | ✅ | PaddleOCR | Windows |
| TRex | Swift | ✅ | Vision+Tesseract | macOS |
| Ksnip | Qt | ✅ | Tesseract 插件 | 全平台 |

---

## 六、建議實作路線

### 階段一：MVP (最小可行產品)

1. **框架選擇：** Tauri 2.0
2. **截圖：** `tauri-plugin-screenshots`
3. **OCR：** Tesseract (初期) → PaddleOCR (優化)
4. **目標功能：**
   - 全局快捷鍵呼出
   - 區域選取截圖
   - 文字識別並複製到剪貼簿

### 階段二：功能完善

- 添加 OCR 引擎選項 (Tesseract/PaddleOCR/雲端)
- 多語言切換
- 歷史記錄管理
- 系統托盤常駐

### 階段三：進階功能

- 翻譯整合
- PDF OCR
- 批量處理
- AI 輔助校正

---

## 七、關鍵資源連結

### 框架文檔
- [Tauri 2.0 官方文檔](https://tauri.app)
- [Electron 文檔](https://electronjs.org)
- [Flutter Desktop](https://flutter.dev/desktop)

### OCR 引擎
- [PaddleOCR GitHub](https://github.com/PaddlePaddle/PaddleOCR)
- [EasyOCR GitHub](https://github.com/JaidedAI/EasyOCR)
- [Tesseract GitHub](https://github.com/tesseract-ocr/tesseract)

### 參考開源專案
- [Umi-OCR](https://github.com/hiroi-sora/Umi-OCR)
- [Biyi 比譯](https://github.com/biyidev/biyi)
- [TRex](https://github.com/trex-ai/trex)
- [Ksnip](https://github.com/ksnip/ksnip)

---

*報告更新時間：2025-01-01*

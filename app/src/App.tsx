import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { register } from "@tauri-apps/plugin-global-shortcut";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { SnippingOverlay } from "./components/SnippingOverlay";
import { ShibaLogo } from "./components/ShibaLogo";
import { HistoryDrawer } from "./components/HistoryDrawer";
import { SettingsModal } from "./components/SettingsModal";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  Copy,
  Check,
  Globe,
  Command,
  X,
  Zap,
  Maximize2,
  Bone,
  Settings,
  Search,
  Languages
} from "lucide-react";
import { notifyOcrComplete } from "./utils/notification";
import { addToHistory, getHistory, clearHistory, HistoryItem } from "./utils/history";
import { soundManager } from "./utils/SoundManager";
import { translateText, COMMON_TARGET_LANGUAGES } from "./utils/translate";
import "./App.css";

function App() {
  const { t } = useTranslation();

  // --- State ---
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [selectedLang, setSelectedLang] = useState("eng+chi_tra");
  const [autoCopy, setAutoCopy] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [directSnip, setDirectSnip] = useState(false);
  const [silentMode, setSilentMode] = useState(false);
  const [ocrEngine, setOcrEngine] = useState("auto");
  const [availableEngines, setAvailableEngines] = useState<string[]>(["auto", "tesseract"]);

  // Custom Shortcut
  const DEFAULT_SHORTCUT = "CommandOrControl+Shift+X";
  const [customShortcut, setCustomShortcut] = useState(DEFAULT_SHORTCUT);
  const customShortcutRef = useRef(customShortcut);

  // Refs to access current values in callbacks (avoid stale closures)
  const directSnipRef = useRef(directSnip);
  const silentModeRef = useRef(silentMode);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // Translation state
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateEnabled, setTranslateEnabled] = useState(true);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [targetLang, setTargetLang] = useState('zh'); // Default to Chinese

  // --- Initialization ---
  useEffect(() => {
    // Load persisted settings
    const savedAutoCopy = localStorage.getItem('autoCopy');
    if (savedAutoCopy) setAutoCopy(savedAutoCopy === 'true');

    const savedSound = localStorage.getItem('soundEnabled');
    if (savedSound) {
      const enabled = savedSound === 'true';
      setSoundEnabled(enabled);
      soundManager.setEnabled(enabled);
    }

    const savedDirectSnip = localStorage.getItem('directSnip');
    if (savedDirectSnip) {
      const enabled = savedDirectSnip === 'true';
      setDirectSnip(enabled);
      directSnipRef.current = enabled;
    }

    const savedSilentMode = localStorage.getItem('silentMode');
    if (savedSilentMode) {
      const enabled = savedSilentMode === 'true';
      setSilentMode(enabled);
      silentModeRef.current = enabled;
    }

    // Load OCR Engine preference
    const savedOcrEngine = localStorage.getItem('ocrEngine');
    if (savedOcrEngine) setOcrEngine(savedOcrEngine);

    // Load custom shortcut
    const savedShortcut = localStorage.getItem('customShortcut');
    if (savedShortcut) {
      setCustomShortcut(savedShortcut);
      customShortcutRef.current = savedShortcut;
    }

    // Fetch available OCR engines from backend
    invoke<string[]>("get_ocr_engines").then(engines => {
      if (engines && engines.length > 0) {
        setAvailableEngines(engines);
      }
    }).catch(e => console.error("Failed to get OCR engines:", e));

    // Load History
    setHistoryItems(getHistory());

    let shortcutRegistered = false;
    let currentRegisteredShortcut = "";
    const initShortcut = async () => {
      try {
        const { unregister } = await import("@tauri-apps/plugin-global-shortcut");
        const shortcutToRegister = customShortcutRef.current || DEFAULT_SHORTCUT;
        // Try to unregister first in case of hot reload
        try {
          await unregister(shortcutToRegister);
        } catch {
          // Ignore if not registered
        }
        await register(shortcutToRegister, async (event) => {
          if (event.state === "Pressed") {
            await captureScreen();
          }
        });
        shortcutRegistered = true;
        currentRegisteredShortcut = shortcutToRegister;
        console.log(`✅ Global shortcut registered: ${shortcutToRegister}`);
      } catch (err) {
        console.error("Failed to register shortcut:", err);
      }
    };
    initShortcut();

    // Listen for tray capture event
    const setupTrayListener = async () => {
      const { listen } = await import("@tauri-apps/api/event");
      const unlisten = await listen("tray-capture", () => {
        captureScreen();
      });
      return unlisten;
    };
    const unlistenPromise = setupTrayListener();

    return () => {
      unlistenPromise.then(unlisten => unlisten());
      // Cleanup shortcut on unmount
      if (shortcutRegistered && currentRegisteredShortcut) {
        import("@tauri-apps/plugin-global-shortcut").then(({ unregister }) => {
          unregister(currentRegisteredShortcut).catch(() => { });
        });
      }
    };
  }, []);

  // --- Actions ---
  const handleSetAutoCopy = (enabled: boolean) => {
    setAutoCopy(enabled);
    localStorage.setItem('autoCopy', String(enabled));
  };

  const handleSetSoundEnabled = (enabled: boolean) => {
    setSoundEnabled(enabled);
    soundManager.setEnabled(enabled);
    localStorage.setItem('soundEnabled', String(enabled));
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistoryItems([]);
    setShowSettings(false);
  };

  const handleSetDirectSnip = (enabled: boolean) => {
    setDirectSnip(enabled);
    directSnipRef.current = enabled; // Keep ref in sync
    localStorage.setItem('directSnip', String(enabled));
  };

  const handleSetSilentMode = (enabled: boolean) => {
    setSilentMode(enabled);
    silentModeRef.current = enabled; // Keep ref in sync
    localStorage.setItem('silentMode', String(enabled));
  };

  const handleSetCustomShortcut = async (newShortcut: string) => {
    if (!newShortcut || newShortcut === customShortcut) return;

    try {
      const { unregister } = await import("@tauri-apps/plugin-global-shortcut");
      // Unregister old shortcut
      try {
        await unregister(customShortcutRef.current);
      } catch {
        // Ignore if not registered
      }
      // Register new shortcut
      await register(newShortcut, async (event) => {
        if (event.state === "Pressed") {
          await captureScreen();
        }
      });
      // Update state and persist
      setCustomShortcut(newShortcut);
      customShortcutRef.current = newShortcut;
      localStorage.setItem('customShortcut', newShortcut);
      console.log(`✅ Shortcut updated to: ${newShortcut}`);
    } catch (err) {
      console.error("Failed to update shortcut:", err);
      throw err; // Let UI handle the error
    }
  };

  const handleSetOcrEngine = (engine: string) => {
    setOcrEngine(engine);
    localStorage.setItem('ocrEngine', engine);
  };

  const handleTranslate = async () => {
    if (!ocrResult.trim() || isTranslating) return;

    setIsTranslating(true);
    setTranslatedText("");
    try {
      const result = await translateText({
        text: ocrResult,
        targetLang: targetLang,
      });
      setTranslatedText(result.translatedText);
      soundManager.playSuccess();
    } catch (error) {
      console.error("Translation failed:", error);
      soundManager.playError();
    } finally {
      setIsTranslating(false);
    }
  };

  async function captureScreen() {
    try {
      soundManager.playShutter(); // 📸 SNAP!
      setOcrResult("");

      const window = getCurrentWebviewWindow();

      // Freeze Mode: Hide -> Capture Full -> Show Preview
      await window.hide();
      await new Promise(resolve => setTimeout(resolve, 150)); // Reduced delay
      const base64: string = await invoke("capture_full_screen");
      setScreenshot(`data:image/png;base64,${base64}`);
      await window.setFullscreen(true);
      await window.show();
      await window.setFocus();
    } catch (e) {
      console.error("Failed to capture screen:", e);
      soundManager.playError();
      const window = getCurrentWebviewWindow();
      await window.setFullscreen(false);
      await window.show();
    }
  }

  async function restoreWindow() {
    const window = getCurrentWebviewWindow();
    await window.setFullscreen(false);
    // In Direct Mode, we might want to ensure we're not hidden if we cancel?
    // Usually setFullscreen(false) is enough to go back to normal window
  }

  async function runOcr(base64: string) {
    setIsLoading(true);
    try {
      // Hide window immediately during OCR if silent logic dictates, 
      // but usually we want to see the loading state?
      // Actually runOcr restores window size.
      const window = getCurrentWebviewWindow();
      await window.setFullscreen(false);

      // ... rest of runOcr
      const qrResult: string | null = await invoke("scan_qr", { base64Image: base64 });
      let text: string;

      if (qrResult) {
        text = `[QR Code]\n${qrResult}`;
      } else {
        // Use the selected OCR engine from settings
        // When "auto": CJK languages → Windows OCR (on Windows), other → Tesseract
        text = await invoke("perform_ocr", { base64Image: base64, langs: selectedLang, engine: ocrEngine });
      }

      setOcrResult(text || "__EMPTY__");

      if (text && text.trim()) {
        soundManager.playBark(); // 🐕 WOOF!
        addToHistory(text, qrResult ? "QR" : selectedLang);
        setHistoryItems(getHistory()); // Refresh history view
        notifyOcrComplete(text.length);

        if (autoCopy) {
          const textToCopy = qrResult || text;
          navigator.clipboard.writeText(textToCopy);
          setIsCopied(true);
          soundManager.playSuccess(); // ✨ DING!
          setTimeout(() => setIsCopied(false), 2000);

          // Silent mode: hide window after successful OCR + copy
          if (silentModeRef.current) {
            const win = getCurrentWebviewWindow();
            await win.hide();
          }
        }
      } else {
        soundManager.playError();
      }
    } catch (e) {
      console.error("OCR Failed:", e);
      soundManager.playError();
      setOcrResult("Error: " + e);
    } finally {
      setIsLoading(false);
    }
  }

  const handleCopy = () => {
    const text = ocrResult.startsWith("[QR Code]")
      ? ocrResult.replace("[QR Code]\n", "")
      : ocrResult;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    soundManager.playSuccess(); // ✨ DING!
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSearch = async () => {
    const text = ocrResult.startsWith("[QR Code]")
      ? ocrResult.replace("[QR Code]\n", "")
      : ocrResult;

    if (!text || text === "__EMPTY__" || text.trim().length === 0 || text.startsWith("Error:")) return;

    const searchQuery = encodeURIComponent(text.trim().substring(0, 200));
    const searchUrl = `https://www.google.com/search?q=${searchQuery}`;

    // Use Tauri's opener plugin to open the URL in the default browser
    try {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(searchUrl);
      soundManager.playSuccess();
    } catch (e) {
      console.error("Failed to open search:", e);
      // Fallback to window.open
      const win = window.open(searchUrl, "_blank");
      if (!win) {
        console.error("Popup blocked or window.open failed");
        // We can use a general console error for now or a better UI feedback
      }
    }
  };

  // --- Design Tokens (mapped from CSS vars) ---
  // Background: --color-paper (#f5f2eb)
  // Text: --color-ink (#0a0a0a)
  // Accent: --color-electric (#00ff88)

  return (
    <div className="min-h-screen w-full bg-[#f5f2eb] text-[#0a0a0a] flex flex-col font-mono selection:bg-[#00ff88] selection:text-[#0a0a0a] overflow-hidden">

      {!screenshot && (<>

        {/* Decorative Background Pattern */}
        <div className="fixed inset-0 pointer-events-none opacity-5 overflow-hidden z-0">
          <div className="absolute top-10 right-10 transform rotate-12"><Bone size={64} /></div>
          <div className="absolute bottom-20 left-10 transform -rotate-45"><Bone size={48} /></div>
          <div className="absolute top-1/2 left-4 transform rotate-90"><Bone size={32} /></div>
        </div>

        {/* Border Frame */}
        <div className="fixed top-0 left-0 w-full h-1 bg-[#0a0a0a] z-50"></div>
        <div className="fixed bottom-0 left-0 w-full h-1 bg-[#0a0a0a] z-50"></div>
        <div className="fixed left-0 top-0 h-full w-1 bg-[#0a0a0a] z-50"></div>
        <div className="fixed right-0 top-0 h-full w-1 bg-[#0a0a0a] z-50"></div>

        {/* Header */}
        <header data-tauri-drag-region className="px-6 py-5 flex items-center justify-center z-10 w-full border-b-2 border-[#0a0a0a] bg-[#f5f2eb]">
          <div className="flex items-center gap-4 reveal reveal-delay-1 group">
            <div className="w-12 h-12 flex items-center justify-center transform group-hover:-rotate-12 transition-transform duration-300 origin-bottom-right">
              <ShibaLogo />
            </div>
            <div>
              <h1 className="text-2xl font-black leading-none translate-y-0.5 tracking-tighter" style={{ fontFamily: 'Syne, sans-serif' }}>
                {t('app.title').split(' ')[0]}<span className="text-[#ff6b35]">_</span>{t('app.title').split(' ')[1] || 'INU'}
              </h1>
              <p className="text-[9px] uppercase tracking-[0.2em] font-bold bg-[#0a0a0a] text-[#00ff88] px-1 w-fit mt-1">
                {t('app.subtitle')}
              </p>
            </div>
          </div>
          <div className="reveal reveal-delay-2 ml-6">
            <div className="hidden sm:flex items-center gap-1 bg-[#e8e4db] px-2 py-1 border border-[#0a0a0a] shadow-[2px_2px_0px_#0a0a0a]">
              {navigator.userAgent.includes('Mac') ? <Command size={12} /> : <span className="text-[10px] font-black mr-0.5">CTRL</span>}
              <span className="text-xs font-bold">SHIFT+X</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col p-6 gap-6 overflow-hidden relative z-10">

          {/* State View Switcher */}
          {!ocrResult && !isLoading ? (
            // Hero / Idle State
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 reveal reveal-delay-3 pb-8">

              <button
                className="relative group cursor-pointer z-[100] pointer-events-auto focus:outline-none"
                onClick={() => {
                  captureScreen();
                }}
              >
                {/* Brutalist Shadow Box */}
                <div className="absolute inset-0 bg-[#0a0a0a] translate-x-3 translate-y-3 transition-transform group-hover:translate-x-5 group-hover:translate-y-5 pointer-events-none"></div>

                {/* Main Action Button */}
                <div className="relative bg-[#00ff88] w-48 h-48 border-2 border-[#0a0a0a] flex flex-col items-center justify-center gap-4 transition-transform group-hover:-translate-y-1 group-hover:-translate-x-1 overflow-hidden pointer-events-none">
                  {/* Background Stripes */}
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 10px)" }}></div>

                  <Maximize2 size={48} className="text-[#0a0a0a] relative z-10" strokeWidth={2} />
                  <div className="bg-[#0a0a0a] text-[#f5f2eb] px-4 py-1 font-black text-sm tracking-widest uppercase transform -rotate-2 relative z-10 border border-[#f5f2eb]">
                    {t('status.ready')}
                  </div>
                </div>
              </button>

              <div className="space-y-4 max-w-[280px]">
                <h2 className="text-3xl font-black leading-none uppercase italic whitespace-pre-line" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {t('app.doge_quote_1')}
                </h2>
                <div className="h-0.5 w-full bg-[#0a0a0a] mx-auto pattern-wavy"></div>
                <p className="text-xs font-bold font-mono opacity-100 bg-[#e8e4db] p-2 border border-[#0a0a0a] shadow-[2px_2px_0px_#0a0a0a]">
                  "{t('app.doge_quote_2')}"
                </p>
              </div>
            </div>
          ) : (
            // Result / Loading State
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  className="flex-1 flex flex-col items-center justify-center"
                >
                  <div className="w-16 h-16 border-4 border-[#0a0a0a] border-t-[#ff6b35] rounded-none animate-spin mb-6 shadow-[4px_4px_0px_#0a0a0a]"></div>
                  <p className="text-lg font-black blink uppercase bg-[#00ff88] px-2 text-[#0a0a0a]">{t('status.processing')}</p>
                </motion.div>
              ) : (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95, rotate: -1 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  className="flex-1 w-full flex flex-col h-full bg-white border-2 border-[#0a0a0a] shadow-[8px_8px_0px_#0a0a0a] relative overflow-hidden"
                >
                  {/* Result Header */}
                  <div className="flex items-center justify-between p-3 border-b-2 border-[#0a0a0a] bg-[#00ff88]">
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-black fill-white" />
                      <span className="font-black text-sm uppercase tracking-wider">{t('status.retrieved')}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleCopy} className="p-1.5 bg-white border-2 border-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-[#00ff88] transition-colors shadow-[2px_2px_0px_#0a0a0a] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]" title={t('status.copy')}>
                        {isCopied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={3} />}
                      </button>
                      <button onClick={handleSearch} className="p-1.5 bg-white border-2 border-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-[#00ff88] transition-colors shadow-[2px_2px_0px_#0a0a0a] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]" title={t('status.search')}>
                        <Search size={16} strokeWidth={3} />
                      </button>
                      {translateEnabled && (
                        <button
                          onClick={handleTranslate}
                          disabled={isTranslating}
                          className={`p-1.5 border-2 border-[#0a0a0a] transition-colors shadow-[2px_2px_0px_#0a0a0a] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] ${isTranslating ? 'bg-[#00ff88] animate-pulse' : 'bg-white hover:bg-[#0a0a0a] hover:text-[#00ff88]'}`}
                          title={t('status.translate') || 'Translate'}
                        >
                          <Languages size={16} strokeWidth={3} />
                        </button>
                      )}
                      <button onClick={() => { setOcrResult(""); setTranslatedText(""); }} className="p-1.5 bg-white border-2 border-[#0a0a0a] hover:bg-[#ff6b35] hover:text-white transition-colors shadow-[2px_2px_0px_#0a0a0a] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]" title={t('status.clear')}>
                        <X size={16} strokeWidth={3} />
                      </button>
                    </div>
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white font-mono text-xs leading-loose whitespace-pre-wrap selection:bg-[#ff6b35] selection:text-white">
                    {ocrResult === "__EMPTY__" ? (
                      <span className="opacity-50 italic">{t('status.empty')}</span>
                    ) : ocrResult.startsWith("Error:") ? (
                      <span className="text-[#ff6b35] font-bold bg-[#0a0a0a] px-1 text-white">{t('status.error')} {ocrResult.replace("Error:", "")}</span>
                    ) : (
                      ocrResult
                    )}

                    {/* Translation Result */}
                    {translatedText && (
                      <div className="mt-4 pt-4 border-t-2 border-dashed border-[#0a0a0a]/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Languages size={14} className="text-[#00ff88]" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#0a0a0a]/50">
                            {t('status.translated') || 'Translated'}
                          </span>
                        </div>
                        <div className="bg-[#00ff88]/10 p-2 border border-[#00ff88]">
                          {translatedText}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fab to Retake - Dog paw style? No, keep it functional but styled */}
                  <button
                    className="absolute bottom-4 right-4 bg-[#0a0a0a] text-[#00ff88] p-3 shadow-[4px_4px_0px_#ff6b35] hover:shadow-[2px_2px_0px_#ff6b35] hover:translate-y-[2px] hover:translate-x-[2px] border-2 border-[#00ff88] transition-all"
                    onClick={captureScreen}
                  >
                    <Maximize2 size={24} strokeWidth={2.5} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Footer Controls */}
          <div className="grid grid-cols-[1fr,auto,auto] gap-4 z-10 reveal reveal-delay-4 mt-auto">
            {/* Language Select - Brutalist input */}
            <div className="relative group">
              <div className="absolute inset-0 bg-[#0a0a0a] translate-x-1 translate-y-1 transition-transform group-hover:translate-x-1.5 group-hover:translate-y-1.5 pointer-events-none"></div>
              <div className="relative bg-white border-2 border-[#0a0a0a] p-1 flex items-center h-12">
                <div className="px-3 border-r-2 border-[#0a0a0a] h-full flex items-center bg-[#00ff88] text-[#0a0a0a]">
                  <Globe size={18} strokeWidth={2.5} />
                </div>
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="w-full bg-transparent border-none outline-none px-3 text-xs font-black uppercase cursor-pointer appearance-none tracking-wider"
                >
                  <option value="eng">{t('settings.language.en')}</option>
                  <option value="chi_tra+eng">{t('settings.language.zh-TW')}</option>
                  <option value="chi_sim+eng">{t('settings.language.chi_sim')}</option>
                  <option value="jpn+eng">{t('settings.language.jpn')}</option>
                  <option value="kor+eng">{t('settings.language.kor')}</option>
                </select>
                <div className="absolute right-3 pointer-events-none transform rotate-90 font-black text-lg">›</div>
              </div>
            </div>

            {/* Settings Toggle */}
            <button
              onClick={() => setShowSettings(true)}
              className="relative group w-12 h-12"
              title={t('settings.title')}
            >
              <div className="absolute inset-0 bg-[#0a0a0a] translate-x-1 translate-y-1 transition-transform group-hover:translate-x-1.5 group-hover:translate-y-1.5 pointer-events-none"></div>
              <div className="relative bg-[#e8e4db] w-full h-full border-2 border-[#0a0a0a] flex items-center justify-center transition-colors hover:bg-white group-hover:bg-[#00ff88]">
                <Settings size={22} className="text-[#0a0a0a]" />
              </div>
            </button>

            {/* History Toggle */}
            <button
              onClick={() => { setHistoryItems(getHistory()); setShowHistory(true); }}
              className="relative group w-12 h-12"
              title={t('history.title')}
            >
              <div className="absolute inset-0 bg-[#0a0a0a] translate-x-1 translate-y-1 transition-transform group-hover:translate-x-1.5 group-hover:translate-y-1.5 pointer-events-none"></div>
              <div className="relative bg-[#ff6b35] w-full h-full border-2 border-[#0a0a0a] flex items-center justify-center transition-colors hover:bg-white">
                <Bone size={22} className="text-[#0a0a0a] transform -rotate-45" fill="currentColor" />
              </div>
            </button>
          </div>


        </main>

        <AnimatePresence>
          {showSettings && (
            <SettingsModal
              isOpen={showSettings}
              onClose={() => setShowSettings(false)}
              soundEnabled={soundEnabled}
              setSoundEnabled={handleSetSoundEnabled}
              autoCopy={autoCopy}
              setAutoCopy={handleSetAutoCopy}
              directSnip={directSnip}
              setDirectSnip={handleSetDirectSnip}
              silentMode={silentMode}
              setSilentMode={handleSetSilentMode}
              ocrEngine={ocrEngine}
              setOcrEngine={handleSetOcrEngine}
              availableEngines={availableEngines}
              onClearHistory={handleClearHistory}
              customShortcut={customShortcut}
              setCustomShortcut={handleSetCustomShortcut}
              translateEnabled={translateEnabled}
              setTranslateEnabled={setTranslateEnabled}
              autoTranslate={autoTranslate}
              setAutoTranslate={setAutoTranslate}
              targetLang={targetLang}
              setTargetLang={setTargetLang}
              targetLanguages={COMMON_TARGET_LANGUAGES}
            />
          )}
        </AnimatePresence>

        {/* History Drawer */}
        <AnimatePresence>
          {showHistory && (
            <HistoryDrawer
              isOpen={showHistory}
              onClose={() => setShowHistory(false)}
              historyItems={historyItems}
              onClearHistory={() => { clearHistory(); setHistoryItems([]); }}
              onCopyItem={() => { setIsCopied(true); setTimeout(() => setIsCopied(false), 1000); }}
            />
          )}
        </AnimatePresence>

      </>)
      }

      {/* Snipping Overlay */}
      {
        screenshot && (
          <SnippingOverlay
            image={screenshot}
            onClose={async () => {
              await restoreWindow();
              setScreenshot(null);
            }}
            onCrop={async (croppedImage: string) => {
              await restoreWindow();
              setScreenshot(null);
              runOcr(croppedImage);
            }}
          />
        )
      }
    </div >
  );
}

export default App;

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { register } from "@tauri-apps/plugin-global-shortcut";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { SnippingOverlay } from "./components/SnippingOverlay";
import { ShibaLogo } from "./components/ShibaLogo";
import { HistoryDrawer } from "./components/HistoryDrawer";
import { SettingsModal } from "./components/SettingsModal";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Check,
  Globe,
  Command,
  X,
  Zap,
  Maximize2,
  Bone,
  Settings
} from "lucide-react";
import { notifyOcrComplete } from "./utils/notification";
import { addToHistory, getHistory, clearHistory, HistoryItem } from "./utils/history";
import { soundManager } from "./utils/SoundManager";
import "./App.css";

function App() {
  // --- State ---
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [selectedLang, setSelectedLang] = useState("eng+chi_tra");
  const [autoCopy, setAutoCopy] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [directSnip, setDirectSnip] = useState(false);
  const [silentMode, setSilentMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

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
    if (savedDirectSnip) setDirectSnip(savedDirectSnip === 'true');

    const savedSilentMode = localStorage.getItem('silentMode');
    if (savedSilentMode) setSilentMode(savedSilentMode === 'true');

    // Load History
    setHistoryItems(getHistory());

    const initShortcut = async () => {
      try {
        await register("CommandOrControl+Shift+X", async (event) => {
          if (event.state === "Pressed") {
            await captureScreen();
          }
        });
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
    localStorage.setItem('directSnip', String(enabled));
  };

  const handleSetSilentMode = (enabled: boolean) => {
    setSilentMode(enabled);
    localStorage.setItem('silentMode', String(enabled));
  };

  async function captureScreen() {
    try {
      soundManager.playShutter(); // 📸 SNAP!
      setOcrResult("");
      const window = getCurrentWebviewWindow();
      await window.hide();
      await new Promise(resolve => setTimeout(resolve, 300));
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
  }

  async function runOcr(base64: string) {
    setIsLoading(true);
    try {
      const window = getCurrentWebviewWindow();
      await window.setFullscreen(false);

      const qrResult: string | null = await invoke("scan_qr", { base64Image: base64 });
      let text: string;

      if (qrResult) {
        text = `[QR Code]\n${qrResult}`;
      } else {
        text = await invoke("perform_ocr", { base64Image: base64, langs: selectedLang });
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
          if (silentMode) {
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
        <header className="px-6 py-5 flex items-center justify-between z-10 w-full border-b-2 border-[#0a0a0a] bg-[#f5f2eb]">
          <div className="flex items-center gap-4 reveal reveal-delay-1 group">
            <div className="w-12 h-12 flex items-center justify-center transform group-hover:-rotate-12 transition-transform duration-300 origin-bottom-right">
              <ShibaLogo />
            </div>
            <div>
              <h1 className="text-2xl font-black leading-none translate-y-0.5 tracking-tighter" style={{ fontFamily: 'Syne, sans-serif' }}>
                SCREEN<span className="text-[#ff6b35]">_</span>INU
              </h1>
              <p className="text-[9px] uppercase tracking-[0.2em] font-bold bg-[#0a0a0a] text-[#00ff88] px-1 w-fit mt-1">
                Official Doge OCR
              </p>
            </div>
          </div>
          <div className="reveal reveal-delay-2">
            <div className="flex items-center gap-1 bg-[#e8e4db] px-2 py-1 border border-[#0a0a0a] shadow-[2px_2px_0px_#0a0a0a]">
              <Command size={12} />
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
                    FETCH TEXT
                  </div>
                </div>
              </button>

              <div className="space-y-4 max-w-[280px]">
                <h2 className="text-3xl font-black leading-none uppercase italic" style={{ fontFamily: 'Syne, sans-serif' }}>
                  SUCH PIXELS.<br />MANY TEXT.
                </h2>
                <div className="h-0.5 w-full bg-[#0a0a0a] mx-auto pattern-wavy"></div>
                <p className="text-xs font-bold font-mono opacity-100 bg-[#e8e4db] p-2 border border-[#0a0a0a] shadow-[2px_2px_0px_#0a0a0a]">
                  "Wow. Select region. Very extract."
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
                  <p className="text-lg font-black blink uppercase bg-[#00ff88] px-2 text-[#0a0a0a]">SNIFFING DATA...</p>
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
                      <span className="font-black text-sm uppercase tracking-wider">RETRIEVED BONE</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleCopy} className="p-1.5 bg-white border-2 border-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-[#00ff88] transition-colors shadow-[2px_2px_0px_#0a0a0a] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]" title="Copy">
                        {isCopied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={3} />}
                      </button>
                      <button onClick={() => setOcrResult("")} className="p-1.5 bg-white border-2 border-[#0a0a0a] hover:bg-[#ff6b35] hover:text-white transition-colors shadow-[2px_2px_0px_#0a0a0a] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]" title="Throw Away">
                        <X size={16} strokeWidth={3} />
                      </button>
                    </div>
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white font-mono text-xs leading-loose whitespace-pre-wrap selection:bg-[#ff6b35] selection:text-white">
                    {ocrResult === "__EMPTY__" ? (
                      <span className="opacity-50 italic">Empty. Much sad.</span>
                    ) : ocrResult.startsWith("Error:") ? (
                      <span className="text-[#ff6b35] font-bold bg-[#0a0a0a] px-1 text-white">{ocrResult}</span>
                    ) : (
                      ocrResult
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
                  <option value="eng">English (Woof)</option>
                  <option value="chi_tra+eng">Traditional Chinese</option>
                  <option value="chi_sim+eng">Simplified Chinese</option>
                  <option value="jpn+eng">Japanese</option>
                  <option value="kor+eng">Korean</option>
                </select>
                <div className="absolute right-3 pointer-events-none transform rotate-90 font-black text-lg">›</div>
              </div>
            </div>

            {/* Settings Toggle */}
            <button
              onClick={() => setShowSettings(true)}
              className="relative group w-12 h-12"
              title="Settings"
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
              title="Open Bone Stash"
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
              onClearHistory={handleClearHistory}
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
            onCrop={async (croppedImage) => {
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

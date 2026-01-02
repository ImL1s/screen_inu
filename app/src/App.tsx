import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { register } from "@tauri-apps/plugin-global-shortcut";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { SnippingOverlay } from "./components/SnippingOverlay";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Check,
  Globe,
  Loader2,
  Trash2,
  Command,
  X,
  Zap,
  Maximize2,
  Bone,
  Dog
} from "lucide-react";
import { notifyOcrComplete } from "./utils/notification";
import { addToHistory, getHistory, clearHistory, HistoryItem } from "./utils/history";
import "./App.css";

// --- Brutalist Shiba Component ---
const ShibaLogo = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#0a0a0a]">
    {/* Head Shape - Geometric */}
    <path d="M12 16L4 8V24L12 32V40H36V32L44 24V8L36 16H30L24 10L18 16H12Z" fill="#f5f2eb" stroke="currentColor" strokeWidth="3" />
    {/* Eyes - Electric Green */}
    <rect x="14" y="24" width="4" height="4" fill="#00ff88" stroke="currentColor" strokeWidth="1" />
    <rect x="30" y="24" width="4" height="4" fill="#00ff88" stroke="currentColor" strokeWidth="1" />
    {/* Snout */}
    <rect x="22" y="30" width="4" height="4" fill="currentColor" />
    <path d="M22 34H26V36H22V34Z" fill="currentColor" />
    {/* Ears */}
    <path d="M4 8H12V16H4V8Z" fill="#ff6b35" stroke="currentColor" strokeWidth="2" />
    <path d="M36 8H44V16H36V8Z" fill="#ff6b35" stroke="currentColor" strokeWidth="2" />
  </svg>
);

function App() {
  // --- State ---
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [selectedLang, setSelectedLang] = useState("eng+chi_tra");
  const [autoCopy, setAutoCopy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // --- Initialization ---
  useEffect(() => {
    const savedAutoCopy = localStorage.getItem('autoCopy');
    if (savedAutoCopy) setAutoCopy(savedAutoCopy === 'true');

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
  }, []);

  // --- Actions ---
  const toggleAutoCopy = () => {
    const newValue = !autoCopy;
    setAutoCopy(newValue);
    localStorage.setItem('autoCopy', String(newValue));
  };

  async function captureScreen() {
    try {
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
        addToHistory(text, qrResult ? "QR" : selectedLang);
        notifyOcrComplete(text.length);

        if (autoCopy) {
          const textToCopy = qrResult || text;
          navigator.clipboard.writeText(textToCopy);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        }
      }
    } catch (e) {
      console.error("OCR Failed:", e);
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
          <div className="absolute top-1/2 left-4 transform rotate-90"><Dog size={32} /></div>
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
          <div className="reveal reveal-delay-2 hidden sm:block">
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
          <div className="grid grid-cols-[1fr,auto] gap-4 z-10 reveal reveal-delay-4 mt-auto">
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

          {/* Auto Copy Toggle Text */}
          <div className="flex items-center gap-2 reveal reveal-delay-5 opacity-80 hover:opacity-100 transition-opacity cursor-pointer w-fit mx-auto bg-[#e8e4db] px-2 py-1 border border-transparent hover:border-[#0a0a0a]" onClick={toggleAutoCopy}>
            <div className={`w-3 h-3 border-2 border-[#0a0a0a] ${autoCopy ? 'bg-[#ff6b35]' : 'bg-transparent'} transition-colors`}></div>
            <span className="text-[10px] font-bold uppercase tracking-wider">AUTO-FETCH</span>
          </div>

        </main>

        {/* History Drawer - Brutalist Slide */}
        <AnimatePresence>
          {showHistory && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowHistory(false)}
                className="fixed inset-0 bg-[#0a0a0a]/50 backdrop-blur-[2px] z-40"
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "tween", ease: "circOut", duration: 0.3 }}
                className="fixed top-0 right-0 h-full w-[90%] max-w-[320px] bg-[#f5f2eb] border-l-4 border-[#0a0a0a] z-50 flex flex-col shadow-[-20px_0_40px_rgba(0,0,0,0.2)]"
              >
                <div className="p-4 border-b-2 border-[#0a0a0a] flex items-center justify-between bg-[#0a0a0a] text-[#00ff88]">
                  <h3 className="font-black text-lg font-display uppercase tracking-wider flex items-center gap-2">
                    <Bone size={20} fill="#00ff88" className="text-[#0a0a0a]" />
                    BONE STASH
                  </h3>
                  <button onClick={() => setShowHistory(false)} className="hover:rotate-90 transition-transform">
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiMwMDAiIG9wYWNpdHk9IjAuMDUiLz48L3N2Zz4=')]">
                  {historyItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                      <Dog size={64} className="mb-4 text-[#0a0a0a]" strokeWidth={1} />
                      <p className="font-bold font-mono text-sm">NO BONES BURIED YET.</p>
                      <p className="text-xs">Go fetch some text!</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-end mb-2">
                        <button onClick={() => { clearHistory(); setHistoryItems([]); }} className="text-[10px] font-bold uppercase text-[#ff6b35] flex items-center gap-1 hover:bg-[#0a0a0a] hover:text-[#ff6b35] px-2 py-1 transition-colors">
                          <Trash2 size={12} /> DIG UP ALL
                        </button>
                      </div>
                      {historyItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            navigator.clipboard.writeText(item.text);
                            setIsCopied(true);
                            setTimeout(() => setIsCopied(false), 1000);
                          }}
                          className="bg-white border-2 border-[#0a0a0a] p-3 shadow-[4px_4px_0px_#0a0a0a] hover:shadow-[4px_4px_0px_#00ff88] hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-4 h-4 bg-[#0a0a0a] transform rotate-45 translate-x-2 -translate-y-2"></div>
                          <div className="flex justify-between items-start mb-2 border-b-2 border-dashed border-[#0a0a0a]/10 pb-1">
                            <span className="text-[9px] font-black uppercase bg-[#00ff88] text-[#0a0a0a] px-1 border border-[#0a0a0a]">{item.lang}</span>
                            <span className="text-[9px] font-mono opacity-50">{new Date(item.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-xs font-mono line-clamp-3 leading-relaxed opacity-100 group-hover:text-[#0a0a0a]">
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </motion.div>
            </>
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

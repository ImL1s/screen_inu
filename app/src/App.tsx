import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { register } from "@tauri-apps/plugin-global-shortcut";
import { SnippingOverlay } from "./components/SnippingOverlay";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, Copy, Check, Terminal, Languages, Sun, Moon } from "lucide-react";
import "./App.css";

const LANGUAGES = [
  { code: "eng", label: "English" },
  { code: "chi_tra", label: "Traditional Chinese" },
  { code: "jpn", label: "Japanese" },
  { code: "eng+chi_tra", label: "Eng + Chi (Tra)" },
];

function App() {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const [selectedLang, setSelectedLang] = useState("eng+chi_tra");
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [autoCopy, setAutoCopy] = useState(false);

  useEffect(() => {
    // Initialize theme from local storage
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }

    // Initialize auto-copy from local storage
    const savedAutoCopy = localStorage.getItem('autoCopy');
    if (savedAutoCopy) {
      setAutoCopy(savedAutoCopy === 'true');
    }

    const initShortcut = async () => {
      try {
        await register("CommandOrControl+Shift+X", async (event) => {
          console.log("Global shortcut triggered:", event);
          await captureScreen();
        });
      } catch (err) {
        console.error("Failed to register shortcut:", err);
      }
    };
    initShortcut();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const toggleAutoCopy = () => {
    const newValue = !autoCopy;
    setAutoCopy(newValue);
    localStorage.setItem('autoCopy', String(newValue));
  };

  async function captureScreen() {
    try {
      setOcrResult("");
      const base64: string = await invoke("capture_full_screen");
      setScreenshot(`data:image/png;base64,${base64}`);
    } catch (e) {
      console.error("Failed to capture screen:", e);
    }
  }

  async function runOcr(base64: string) {
    try {
      const text: string = await invoke("perform_ocr", { base64Image: base64, langs: selectedLang });
      setOcrResult(text);
      if (autoCopy && text) {
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch (e) {
      console.error("OCR Failed:", e);
      setOcrResult("Error: " + e);
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(ocrResult);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const isDark = theme === 'dark';
  const bgClass = isDark
    ? "bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white"
    : "bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-gray-800";

  const cardBgClass = isDark
    ? "bg-white/5 border-white/10"
    : "bg-white/60 border-indigo-100 shadow-indigo-100";

  const textClass = isDark ? "text-gray-400" : "text-gray-500";
  const headingClass = isDark ? "from-indigo-200 to-white" : "from-indigo-600 to-purple-600";

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-500 ${bgClass}`}>
      {/* Background decoration */}
      <div className={`absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[128px] pointer-events-none transition-colors duration-500 ${isDark ? 'bg-purple-600/30' : 'bg-purple-400/20'}`} />
      <div className={`absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[128px] pointer-events-none transition-colors duration-500 ${isDark ? 'bg-blue-600/20' : 'bg-blue-400/20'}`} />

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className={`absolute top-6 right-6 p-3 rounded-full backdrop-blur-md border transition-all hover:scale-110 z-50 ${isDark ? 'bg-white/10 border-white/10 hover:bg-white/20' : 'bg-white/80 border-indigo-100 shadow-sm hover:bg-white'}`}
      >
        {isDark ? <Sun size={20} className="text-yellow-300" /> : <Moon size={20} className="text-indigo-600" />}
      </button>

      <AnimatePresence>
        {!screenshot && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="z-10 text-center space-y-8"
          >
            <div className="relative inline-block">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                className={`w-24 h-24 backdrop-blur-xl border rounded-2xl flex items-center justify-center shadow-2xl mx-auto transition-colors duration-500 ${isDark ? 'bg-white/10 border-white/20' : 'bg-white border-indigo-50'}`}
              >
                <Scissors className="w-12 h-12 text-indigo-400" />
              </motion.div>
              <div className="absolute inset-0 bg-indigo-500/20 blur-xl -z-10 rounded-full" />
            </div>

            <div className="space-y-2">
              <h1 className={`text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${headingClass}`}>
                Screen Inu
              </h1>
              <p className={`${textClass} text-sm tracking-wide`}>
                SNAP · RECOGNIZE · COPY
              </p>
            </div>

            <div className={`${cardBgClass} backdrop-blur-md border rounded-xl p-6 max-w-sm mx-auto shadow-xl space-y-6 transition-all duration-500`}>
              <div className="flex items-center justify-between space-x-4">
                <div className="text-left">
                  <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider mb-1">Shortcut</p>
                  <p className={`text-lg font-mono px-3 py-1 rounded-md border ${isDark ? 'text-white bg-black/40 border-white/10' : 'text-indigo-900 bg-indigo-50 border-indigo-100'}`}>
                    ⌘ + Shift + X
                  </p>
                </div>
                <div className={`h-10 w-[1px] ${isDark ? 'bg-white/10' : 'bg-indigo-100'}`} />
                <button
                  onClick={captureScreen}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                >
                  <Terminal size={16} />
                  Run Now
                </button>
              </div>

              {/* Language Selector */}
              <div className={`pt-4 border-t ${isDark ? 'border-white/10' : 'border-indigo-100'}`}>
                <label className={`flex items-center gap-2 text-xs mb-2 uppercase tracking-wider font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Languages size={14} className="text-indigo-400" />
                  OCR Language
                </label>
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer transition-colors ${isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-indigo-200 text-gray-700'}`}
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.label}</option>
                  ))}
                </select>
              </div>

              {/* Auto Copy Toggle */}
              <div className="flex items-center justify-between">
                <label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Auto-copy to clipboard</label>
                <button
                  onClick={toggleAutoCopy}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${autoCopy ? 'bg-indigo-600' : 'bg-gray-200'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoCopy ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snipping Overlay */}
      {screenshot && (
        <SnippingOverlay
          image={screenshot}
          onClose={() => setScreenshot(null)}
          onCrop={(croppedImage) => {
            setScreenshot(null);
            runOcr(croppedImage);
          }}
        />
      )}

      {/* OCR Result Modal */}
      <AnimatePresence>
        {ocrResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={() => setOcrResult("")} />

            <motion.div
              className={`${isDark ? 'bg-[#1e1e1e] border-gray-700' : 'bg-white border-gray-200'} border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden pointer-events-auto mx-4 transition-colors duration-300`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-gray-700 bg-gray-800/50 text-white' : 'border-gray-200 bg-gray-50 text-gray-800'}`}>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  OCR Result
                </h2>
                <button
                  onClick={() => setOcrResult("")}
                  className={`${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'} transition-colors`}
                >
                  ✕
                </button>
              </div>

              <div className="p-6">
                <div className={`${isDark ? 'bg-black/30 border-gray-700/50 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'} rounded-xl p-4 min-h-[150px] max-h-[400px] overflow-y-auto font-mono text-sm border whitespace-pre-wrap`}>
                  {ocrResult.startsWith("Error:") ? (
                    <span className="text-red-400">{ocrResult}</span>
                  ) : (
                    ocrResult
                  )}
                </div>
              </div>

              <div className={`px-6 py-4 flex justify-end gap-3 border-t ${isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <button
                  onClick={() => setOcrResult("")}
                  className={`px-4 py-2 text-sm transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}`}
                >
                  Close
                </button>
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${isCopied
                    ? "bg-green-600/20 text-green-400 border border-green-600/50"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                    }`}
                >
                  {isCopied ? <Check size={16} /> : <Copy size={16} />}
                  {isCopied ? "Copied!" : "Copy Text"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;

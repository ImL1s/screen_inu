import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { register } from "@tauri-apps/plugin-global-shortcut";
import { SnippingOverlay } from "./components/SnippingOverlay";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, Copy, Check, Terminal, Languages } from "lucide-react";
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

  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[128px] pointer-events-none" />

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
                className="w-24 h-24 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center shadow-2xl mx-auto"
              >
                <Scissors className="w-12 h-12 text-indigo-400" />
              </motion.div>
              <div className="absolute inset-0 bg-indigo-500/20 blur-xl -z-10 rounded-full" />
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-white">
                Screen Inu
              </h1>
              <p className="text-gray-400 text-sm tracking-wide">
                SNAP · RECOGNIZE · COPY
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 max-w-sm mx-auto shadow-xl space-y-6">
              <div className="flex items-center justify-between space-x-4">
                <div className="text-left">
                  <p className="text-xs text-indigo-300 font-semibold uppercase tracking-wider mb-1">Shortcut</p>
                  <p className="text-lg font-mono text-white bg-black/40 px-3 py-1 rounded-md border border-white/10">
                    ⌘ + Shift + X
                  </p>
                </div>
                <div className="h-10 w-[1px] bg-white/10" />
                <button
                  onClick={captureScreen}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                >
                  <Terminal size={16} />
                  Run Now
                </button>
              </div>

              {/* Language Selector */}
              <div className="pt-4 border-t border-white/10">
                <label className="flex items-center gap-2 text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">
                  <Languages size={14} className="text-indigo-400" />
                  OCR Language
                </label>
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.label}</option>
                  ))}
                </select>
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
              className="bg-[#1e1e1e] border border-gray-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden pointer-events-auto mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-800/50">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  OCR Result
                </h2>
                <button
                  onClick={() => setOcrResult("")}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6">
                <div className="bg-black/30 rounded-xl p-4 min-h-[150px] max-h-[400px] overflow-y-auto text-gray-200 font-mono text-sm border border-gray-700/50 whitespace-pre-wrap">
                  {ocrResult.startsWith("Error:") ? (
                    <span className="text-red-400">{ocrResult}</span>
                  ) : (
                    ocrResult
                  )}
                </div>
              </div>

              <div className="bg-gray-800/50 px-6 py-4 flex justify-end gap-3 border-t border-gray-700">
                <button
                  onClick={() => setOcrResult("")}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
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

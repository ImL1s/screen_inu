import { X, Volume2, VolumeX, Copy, Check, Trash2, Scissors, EyeOff, Eye, Monitor } from "lucide-react";
import { motion } from "framer-motion";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    soundEnabled: boolean;
    setSoundEnabled: (enabled: boolean) => void;
    autoCopy: boolean;
    setAutoCopy: (enabled: boolean) => void;
    directSnip: boolean;
    setDirectSnip: (enabled: boolean) => void;
    silentMode: boolean;
    setSilentMode: (enabled: boolean) => void;
    onClearHistory: () => void;
}

export const SettingsModal = ({
    isOpen,
    onClose,
    soundEnabled,
    setSoundEnabled,
    autoCopy,
    setAutoCopy,
    directSnip,
    setDirectSnip,
    silentMode,
    setSilentMode,
    onClearHistory
}: SettingsModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-[#0a0a0a]/80 backdrop-blur-sm"
            />

            {/* Modal - Diagonal reveal */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-[#f5f2eb] border-2 border-[#0a0a0a] w-full max-w-md shadow-[8px_8px_0px_#00ff88] max-h-[90vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="bg-[#0a0a0a] text-white p-4 flex justify-between items-center sticky top-0 z-10">
                    <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                        Settings
                    </h2>
                    <button onClick={onClose} className="hover:text-[#00ff88] transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">

                    {/* Section: Capture */}
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#0a0a0a]/50 border-b border-[#0a0a0a]/10 pb-1">📸 Capture</div>

                    {/* Direct Snip Toggle */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 border-2 border-[#0a0a0a] ${directSnip ? 'bg-[#00ff88] text-[#0a0a0a]' : 'bg-white text-[#0a0a0a]'}`}>
                                {directSnip ? <Scissors size={24} /> : <Monitor size={24} />}
                            </div>
                            <div>
                                <h3 className="font-black uppercase text-sm">Direct Snip</h3>
                                <p className="text-[10px] font-mono opacity-60">{directSnip ? "Snip desktop directly" : "Show full screenshot first"}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setDirectSnip(!directSnip)}
                            className={`w-12 h-6 border-2 border-[#0a0a0a] relative transition-colors ${directSnip ? 'bg-[#00ff88]' : 'bg-[#e8e4db]'}`}
                        >
                            <div className={`absolute top-0 bottom-0 w-6 bg-[#0a0a0a] transition-transform ${directSnip ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </div>

                    {/* Silent Mode Toggle */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 border-2 border-[#0a0a0a] ${silentMode ? 'bg-[#ff6b35] text-white' : 'bg-white text-[#0a0a0a]'}`}>
                                {silentMode ? <EyeOff size={24} /> : <Eye size={24} />}
                            </div>
                            <div>
                                <h3 className="font-black uppercase text-sm">Silent Mode</h3>
                                <p className="text-[10px] font-mono opacity-60">{silentMode ? "Copy & stay hidden" : "Show window after OCR"}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSilentMode(!silentMode)}
                            className={`w-12 h-6 border-2 border-[#0a0a0a] relative transition-colors ${silentMode ? 'bg-[#00ff88]' : 'bg-[#e8e4db]'}`}
                        >
                            <div className={`absolute top-0 bottom-0 w-6 bg-[#0a0a0a] transition-transform ${silentMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </div>

                    {/* Section: Behavior */}
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#0a0a0a]/50 border-b border-[#0a0a0a]/10 pb-1 pt-2">🐕 Behavior</div>

                    {/* Sound Toggle */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 border-2 border-[#0a0a0a] ${soundEnabled ? 'bg-[#ff6b35] text-white' : 'bg-white text-[#0a0a0a]'}`}>
                                {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                            </div>
                            <div>
                                <h3 className="font-black uppercase text-sm">Retro Sounds</h3>
                                <p className="text-[10px] font-mono opacity-60">8-bit barks and beeps</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            className={`w-12 h-6 border-2 border-[#0a0a0a] relative transition-colors ${soundEnabled ? 'bg-[#00ff88]' : 'bg-[#e8e4db]'}`}
                        >
                            <div className={`absolute top-0 bottom-0 w-6 bg-[#0a0a0a] transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </div>

                    {/* Auto Copy Toggle */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 border-2 border-[#0a0a0a] ${autoCopy ? 'bg-[#00ff88] text-[#0a0a0a]' : 'bg-white text-[#0a0a0a]'}`}>
                                {autoCopy ? <Check size={24} strokeWidth={3} /> : <Copy size={24} />}
                            </div>
                            <div>
                                <h3 className="font-black uppercase text-sm">Auto-Fetch</h3>
                                <p className="text-[10px] font-mono opacity-60">Copy text automatically</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setAutoCopy(!autoCopy)}
                            className={`w-12 h-6 border-2 border-[#0a0a0a] relative transition-colors ${autoCopy ? 'bg-[#00ff88]' : 'bg-[#e8e4db]'}`}
                        >
                            <div className={`absolute top-0 bottom-0 w-6 bg-[#0a0a0a] transition-transform ${autoCopy ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </div>

                    {/* Danger Zone */}
                    <div className="pt-4 border-t-2 border-dashed border-[#0a0a0a]/20">
                        <button
                            onClick={onClearHistory}
                            className="w-full bg-white border-2 border-[#0a0a0a] p-3 flex items-center justify-center gap-2 hover:bg-[#ff6b35] hover:text-white hover:shadow-[4px_4px_0px_#0a0a0a] transition-all group"
                        >
                            <Trash2 size={18} />
                            <span className="font-black uppercase text-sm">Burn History</span>
                        </button>
                    </div>

                </div>
            </motion.div>
        </div>
    );
};


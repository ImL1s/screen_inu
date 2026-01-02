import { X, Volume2, VolumeX, Copy, Check, Trash2, Scissors, EyeOff, Eye, Monitor, Globe, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useState } from "react";

// Detect Windows platform (Direct Snip not supported due to WebView2 transparency bug)
const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows');

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
    const { t, i18n } = useTranslation();
    const [showLangMenu, setShowLangMenu] = useState(false);

    if (!isOpen) return null;

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        setShowLangMenu(false);
    };

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
                        {t('settings.title')}
                    </h2>
                    <button onClick={onClose} className="hover:text-[#00ff88] transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">

                    {/* Section: Language */}
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#0a0a0a]/50 border-b border-[#0a0a0a]/10 pb-1">{t('settings.language.title')}</div>

                    <div className="relative">
                        <button
                            onClick={() => setShowLangMenu(!showLangMenu)}
                            className="w-full flex items-center justify-between p-3 bg-white border-2 border-[#0a0a0a] hover:bg-[#e8e4db] transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Globe size={20} />
                                <span className="font-bold">{t(`settings.language.${i18n.language}` as any) || i18n.language}</span>
                            </div>
                            <ChevronDown size={16} className={`transform transition-transform ${showLangMenu ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showLangMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-[#0a0a0a] shadow-[4px_4px_0px_#0a0a0a] z-20"
                                >
                                    <button
                                        onClick={() => changeLanguage('en')}
                                        className="w-full text-left p-3 hover:bg-[#00ff88] font-mono text-sm border-b border-[#0a0a0a]/10 last:border-0"
                                    >
                                        English
                                    </button>
                                    <button
                                        onClick={() => changeLanguage('zh-TW')}
                                        className="w-full text-left p-3 hover:bg-[#00ff88] font-mono text-sm"
                                    >
                                        繁體中文
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Section: Capture */}
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#0a0a0a]/50 border-b border-[#0a0a0a]/10 pb-1 pt-2">{t('settings.section.capture')}</div>

                    {/* Direct Snip Toggle - Hidden on Windows (transparency bug) */}
                    {!isWindows && (
                        <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 border-2 border-[#0a0a0a] ${directSnip ? 'bg-[#00ff88] text-[#0a0a0a]' : 'bg-white text-[#0a0a0a]'}`}>
                                    {directSnip ? <Scissors size={24} /> : <Monitor size={24} />}
                                </div>
                                <div>
                                    <h3 className="font-black uppercase text-sm">{t('settings.direct_snip.title')}</h3>
                                    <p className="text-[10px] font-mono opacity-60">{directSnip ? t('settings.direct_snip.on') : t('settings.direct_snip.off')}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setDirectSnip(!directSnip)}
                                className={`w-12 h-6 border-2 border-[#0a0a0a] relative transition-colors ${directSnip ? 'bg-[#00ff88]' : 'bg-[#e8e4db]'}`}
                            >
                                <div className={`absolute top-0 bottom-0 w-6 bg-[#0a0a0a] transition-transform ${directSnip ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                    )}

                    {/* Silent Mode Toggle */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 border-2 border-[#0a0a0a] ${silentMode ? 'bg-[#ff6b35] text-white' : 'bg-white text-[#0a0a0a]'}`}>
                                {silentMode ? <EyeOff size={24} /> : <Eye size={24} />}
                            </div>
                            <div>
                                <h3 className="font-black uppercase text-sm">{t('settings.silent_mode.title')}</h3>
                                <p className="text-[10px] font-mono opacity-60">{silentMode ? t('settings.silent_mode.on') : t('settings.silent_mode.off')}</p>
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
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#0a0a0a]/50 border-b border-[#0a0a0a]/10 pb-1 pt-2">{t('settings.section.app')}</div>

                    {/* Sound Toggle */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 border-2 border-[#0a0a0a] ${soundEnabled ? 'bg-[#ff6b35] text-white' : 'bg-white text-[#0a0a0a]'}`}>
                                {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
                            </div>
                            <div>
                                <h3 className="font-black uppercase text-sm">{t('settings.sound.title')}</h3>
                                <p className="text-[10px] font-mono opacity-60">{soundEnabled ? t('settings.sound.on') : t('settings.sound.off')}</p>
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
                                <h3 className="font-black uppercase text-sm">{t('settings.auto_copy.title')}</h3>
                                <p className="text-[10px] font-mono opacity-60">{autoCopy ? t('settings.auto_copy.on') : t('settings.auto_copy.off')}</p>
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
                            <span className="font-black uppercase text-sm">{t('history.clear_all')}</span>
                        </button>
                    </div>

                </div>
            </motion.div>
        </div>
    );
};

import { X, Volume2, VolumeX, Copy, Check, Trash2, Scissors, EyeOff, Eye, Monitor, Globe, ChevronDown, Cpu, Keyboard, Languages } from "lucide-react";
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
    ocrEngine: string;
    setOcrEngine: (engine: string) => void;
    availableEngines: string[];
    onClearHistory: () => void;
    customShortcut: string;
    setCustomShortcut: (shortcut: string) => Promise<void>;
    // Translation settings
    translateEnabled: boolean;
    setTranslateEnabled: (enabled: boolean) => void;
    autoTranslate: boolean;
    setAutoTranslate: (enabled: boolean) => void;
    targetLang: string;
    setTargetLang: (lang: string) => void;
    targetLanguages: { code: string; name: string; flag: string }[];
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
    ocrEngine,
    setOcrEngine,
    availableEngines,
    onClearHistory,
    customShortcut,
    setCustomShortcut,
    translateEnabled,
    setTranslateEnabled,
    autoTranslate,
    setAutoTranslate,
    targetLang,
    setTargetLang,
    targetLanguages
}: SettingsModalProps) => {
    const { t, i18n } = useTranslation();
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [showEngineMenu, setShowEngineMenu] = useState(false);
    const [isRecordingShortcut, setIsRecordingShortcut] = useState(false);
    const [shortcutError, setShortcutError] = useState<string | null>(null);

    const engineLabels: Record<string, string> = {
        'auto': t('settings.ocr_engine.auto') || 'Auto (Smart Selection)',
        'tesseract': 'Tesseract OCR',
        'windows': 'Windows OCR',
        'apple': 'Apple Vision'
    };

    if (!isOpen) return null;

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        setShowLangMenu(false);
    };

    const handleShortcutKeyDown = async (e: React.KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Build shortcut string
        const modifiers: string[] = [];
        if (e.ctrlKey || e.metaKey) modifiers.push('CommandOrControl');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');

        // Get the key (ignore modifier-only keys)
        const key = e.key;
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) return;

        // Format key properly
        let formattedKey = key.length === 1 ? key.toUpperCase() : key;
        // Handle special keys
        if (formattedKey === ' ') formattedKey = 'Space';
        if (formattedKey === 'Escape') {
            setIsRecordingShortcut(false);
            return;
        }

        const newShortcut = [...modifiers, formattedKey].join('+');

        if (modifiers.length === 0) {
            setShortcutError('Shortcut must include Ctrl/Cmd, Alt, or Shift');
            return;
        }

        try {
            setShortcutError(null);
            await setCustomShortcut(newShortcut);
            setIsRecordingShortcut(false);
        } catch {
            setShortcutError('Failed to register shortcut. It may be in use.');
        }
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
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-title"
            >
                {/* Header */}
                <div className="bg-[#0a0a0a] text-white p-4 flex justify-between items-center sticky top-0 z-10">
                    <h2 id="settings-title" className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
                        {t('settings.title')}
                    </h2>
                    <button onClick={onClose} className="hover:text-[#00ff88] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff88] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] rounded-sm" aria-label="Close settings">
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
                            className="w-full flex items-center justify-between p-3 bg-white border-2 border-[#0a0a0a] hover:bg-[#e8e4db] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2"
                            aria-haspopup="true"
                            aria-expanded={showLangMenu}
                            aria-label={t('settings.language.title')}
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

                    {/* OCR Engine Selection */}
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#0a0a0a]/50 border-b border-[#0a0a0a]/10 pb-1 pt-2">{t('settings.ocr_engine.title') || 'OCR Engine'}</div>

                    <div className="relative">
                        <button
                            onClick={() => setShowEngineMenu(!showEngineMenu)}
                            className="w-full flex items-center justify-between p-3 bg-white border-2 border-[#0a0a0a] hover:bg-[#e8e4db] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2"
                            aria-haspopup="true"
                            aria-expanded={showEngineMenu}
                            aria-label={t('settings.ocr_engine.title') || 'OCR Engine'}
                        >
                            <div className="flex items-center gap-3">
                                <Cpu size={20} />
                                <span className="font-bold">{engineLabels[ocrEngine] || ocrEngine}</span>
                            </div>
                            <ChevronDown size={16} className={`transform transition-transform ${showEngineMenu ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {showEngineMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-[#0a0a0a] shadow-[4px_4px_0px_#0a0a0a] z-20"
                                >
                                    {availableEngines.map((engine) => (
                                        <button
                                            key={engine}
                                            onClick={() => { setOcrEngine(engine); setShowEngineMenu(false); }}
                                            className={`w-full text-left p-3 hover:bg-[#00ff88] font-mono text-sm border-b border-[#0a0a0a]/10 last:border-0 ${ocrEngine === engine ? 'bg-[#e8e4db]' : ''}`}
                                        >
                                            {engineLabels[engine] || engine}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Section: Capture */}
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#0a0a0a]/50 border-b border-[#0a0a0a]/10 pb-1 pt-2">{t('settings.section.capture')}</div>

                    {/* Custom Shortcut */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 border-2 border-[#0a0a0a] bg-white text-[#0a0a0a]">
                                <Keyboard size={24} />
                            </div>
                            <div>
                                <h3 className="font-black uppercase text-sm">{t('settings.shortcut.title') || 'Capture Shortcut'}</h3>
                                <p className="text-[10px] font-mono opacity-60">{t('settings.shortcut.desc') || 'Global hotkey to capture screen'}</p>
                            </div>
                        </div>
                        {isRecordingShortcut ? (
                            <input
                                type="text"
                                readOnly
                                autoFocus
                                className="w-32 px-2 py-1 border-2 border-[#00ff88] bg-[#00ff88]/10 text-sm font-mono text-center animate-pulse focus:outline-none"
                                placeholder="Press keys..."
                                onKeyDown={handleShortcutKeyDown}
                                onBlur={() => setIsRecordingShortcut(false)}
                            />
                        ) : (
                            <button
                                onClick={() => { setIsRecordingShortcut(true); setShortcutError(null); }}
                                className="px-3 py-1 border-2 border-[#0a0a0a] bg-white hover:bg-[#e8e4db] text-sm font-mono transition-colors"
                            >
                                {customShortcut.replace('CommandOrControl', 'Ctrl')}
                            </button>
                        )}
                    </div>
                    {shortcutError && (
                        <p className="text-[10px] font-mono text-[#ff6b35] -mt-2">{shortcutError}</p>
                    )}

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
                            className={`w-12 h-6 border-2 border-[#0a0a0a] relative transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2 ${silentMode ? 'bg-[#00ff88]' : 'bg-[#e8e4db]'}`}
                            role="switch"
                            aria-checked={silentMode}
                            aria-label={t('settings.silent_mode.title')}
                        >
                            <div className={`absolute top-0 bottom-0 w-6 bg-[#0a0a0a] transition-transform ${silentMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </div>

                    {/* Section: Translation */}
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#0a0a0a]/50 border-b border-[#0a0a0a]/10 pb-1 pt-2">
                        <Languages size={12} className="inline mr-1" />
                        {t('settings.section.translation') || 'Translation'}
                    </div>

                    {/* Enable Translation Toggle */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 border-2 border-[#0a0a0a] ${translateEnabled ? 'bg-[#00ff88] text-[#0a0a0a]' : 'bg-white text-[#0a0a0a]'}`}>
                                <Languages size={24} />
                            </div>
                            <div>
                                <h3 className="font-black uppercase text-sm">{t('settings.translate.title') || 'Enable Translation'}</h3>
                                <p className="text-[10px] font-mono opacity-60">{translateEnabled ? t('settings.translate.on') || 'Show translate button' : t('settings.translate.off') || 'Hidden'}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setTranslateEnabled(!translateEnabled)}
                            className={`w-12 h-6 border-2 border-[#0a0a0a] relative transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2 ${translateEnabled ? 'bg-[#00ff88]' : 'bg-[#e8e4db]'}`}
                            role="switch"
                            aria-checked={translateEnabled}
                            aria-label={t('settings.translate.title') || 'Enable Translation'}
                        >
                            <div className={`absolute top-0 bottom-0 w-6 bg-[#0a0a0a] transition-transform ${translateEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </div>

                    {/* Target Language Selector */}
                    {translateEnabled && (
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-sm">{t('settings.translate.target_lang') || 'Target Language'}</span>
                            <select
                                value={targetLang}
                                onChange={(e) => setTargetLang(e.target.value)}
                                className="px-3 py-1 border-2 border-[#0a0a0a] bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#0a0a0a]"
                                aria-label={t('settings.translate.target_lang') || 'Target Language'}
                            >
                                {targetLanguages.map((lang) => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.flag} {lang.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Auto Translate Toggle */}
                    {translateEnabled && (
                        <div className="flex items-center justify-between group">
                            <div>
                                <h3 className="font-bold text-sm">{t('settings.translate.auto') || 'Auto-Translate'}</h3>
                                <p className="text-[10px] font-mono opacity-60">{autoTranslate ? t('settings.translate.auto_on') || 'Translate after OCR' : t('settings.translate.auto_off') || 'Manual'}</p>
                            </div>
                            <button
                                onClick={() => setAutoTranslate(!autoTranslate)}
                                className={`w-12 h-6 border-2 border-[#0a0a0a] relative transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2 ${autoTranslate ? 'bg-[#00ff88]' : 'bg-[#e8e4db]'}`}
                                role="switch"
                                aria-checked={autoTranslate}
                                aria-label={t('settings.translate.auto') || 'Auto-Translate'}
                            >
                                <div className={`absolute top-0 bottom-0 w-6 bg-[#0a0a0a] transition-transform ${autoTranslate ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                    )}

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
                            className={`w-12 h-6 border-2 border-[#0a0a0a] relative transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2 ${soundEnabled ? 'bg-[#00ff88]' : 'bg-[#e8e4db]'}`}
                            role="switch"
                            aria-checked={soundEnabled}
                            aria-label={t('settings.sound.title')}
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
                            className={`w-12 h-6 border-2 border-[#0a0a0a] relative transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2 ${autoCopy ? 'bg-[#00ff88]' : 'bg-[#e8e4db]'}`}
                            role="switch"
                            aria-checked={autoCopy}
                            aria-label={t('settings.auto_copy.title')}
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

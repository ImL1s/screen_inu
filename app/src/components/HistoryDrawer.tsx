import { motion } from "framer-motion";
import { Bone, Dog, Trash2, X } from "lucide-react";
import { HistoryItem } from "../utils/history";
import { soundManager } from "../utils/SoundManager";
import { useTranslation } from "react-i18next";

interface HistoryDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    historyItems: HistoryItem[];
    onClearHistory: () => void;
    onSelect: (item: HistoryItem) => void;
    onCopyItem: (text: string) => void;
}

/**
 * History Drawer Component (Bone Stash)
 * Slide-in drawer showing OCR history
 */
export const HistoryDrawer = ({
    isOpen,
    onClose,
    historyItems,
    onClearHistory,
    onSelect,
    onCopyItem,
}: HistoryDrawerProps) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    const handleCopyItem = (e: React.MouseEvent, text: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        soundManager.playSuccess();
        onCopyItem(text);
    };

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-[#0a0a0a]/50 backdrop-blur-[2px] z-40"
            />

            {/* Drawer */}
            <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "tween", ease: "circOut", duration: 0.3 }}
                className="fixed top-0 right-0 h-full w-[90%] max-w-[320px] bg-[#f5f2eb] border-l-4 border-[#0a0a0a] z-50 flex flex-col shadow-[-20px_0_40px_rgba(0,0,0,0.2)]"
                role="dialog"
                aria-modal="true"
                aria-label={t('history.title')}
            >
                {/* Header */}
                <div
                    className="p-4 border-b-2 border-[#0a0a0a] flex items-center justify-between bg-[#0a0a0a] text-[#00ff88]"
                    role="heading"
                    aria-level={2}
                >
                    <div className="font-black text-lg font-display uppercase tracking-wider flex items-center gap-2">
                        <Bone size={20} fill="#00ff88" className="text-[#0a0a0a]" />
                        {t('history.title')}
                    </div>
                    <button onClick={onClose} className="hover:rotate-90 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff88] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]" aria-label={t('history.close') || 'Close History'}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiMwMDAiIG9wYWNpdHk9IjAuMDUiLz48L3N2Zz4=')]">
                    {historyItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                            <Dog size={64} className="mb-4 text-[#0a0a0a]" strokeWidth={1} />
                            <p className="font-bold font-mono text-sm">{t('history.empty_title')}</p>
                            <p className="text-xs">{t('history.empty_subtitle')}</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-end mb-2">
                                <button
                                    onClick={onClearHistory}
                                    className="text-[10px] font-bold uppercase text-[#ff6b35] flex items-center gap-1 hover:bg-[#0a0a0a] hover:text-[#ff6b35] px-2 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b35] focus-visible:ring-offset-2"
                                    aria-label={t('history.clear_all')}
                                >
                                    <Trash2 size={12} /> {t('history.clear_all')}
                                </button>
                            </div>
                            {historyItems.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => onSelect(item)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            onSelect(item);
                                        }
                                    }}
                                    className="bg-white border-2 border-[#0a0a0a] p-3 shadow-[4px_4px_0px_#0a0a0a] hover:shadow-[4px_4px_0px_#00ff88] hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff88] focus-visible:ring-offset-2"
                                    aria-label={t('history.item_label') || "Load Item"}
                                >
                                    <div className="absolute top-0 right-0 w-4 h-4 bg-[#0a0a0a] transform rotate-45 translate-x-2 -translate-y-2"></div>
                                    <div className="flex justify-between items-start mb-2 border-b-2 border-dashed border-[#0a0a0a]/10 pb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black uppercase bg-[#00ff88] text-[#0a0a0a] px-1 border border-[#0a0a0a]">
                                                {item.lang}
                                            </span>
                                            <span className="text-[9px] font-mono opacity-50">
                                                {new Date(item.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <button
                                            onClick={(e) => handleCopyItem(e, item.text)}
                                            className="text-[#0a0a0a] hover:text-[#ff6b35] transition-colors p-1 -mr-1 -mt-1 rounded focus:outline-none focus:ring-1 focus:ring-[#ff6b35]"
                                            title={t('common.copy') || "Copy"}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                        </button>
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
    );
};

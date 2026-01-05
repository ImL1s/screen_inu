import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Trash2, Check, Loader2, X, Search, Languages, ArrowRight } from 'lucide-react';

interface TranslationModelInfo {
    name: string;
    source_lang: string;
    target_lang: string;
    size_bytes: number;
    installed: boolean;
    download_url?: string;
}

interface TranslationModelManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TranslationModelManager = ({ isOpen, onClose }: TranslationModelManagerProps) => {
    const { t } = useTranslation();
    const [models, setModels] = useState<TranslationModelInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloadingModel, setDownloadingModel] = useState<string | null>(null);
    const [deletingModel, setDeletingModel] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Load models list
    useEffect(() => {
        if (isOpen) {
            loadModels();
        }
    }, [isOpen]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const loadModels = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await invoke<TranslationModelInfo[]>('list_translation_models');
            setModels(result);
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (modelName: string) => {
        setDownloadingModel(modelName);
        setError(null);
        try {
            await invoke('download_translation_model', { modelName });
            await loadModels(); // Refresh list
        } catch (e) {
            setError(String(e));
        } finally {
            setDownloadingModel(null);
        }
    };

    const handleDelete = async (modelName: string) => {
        setDeletingModel(modelName);
        setError(null);
        try {
            await invoke('delete_translation_model', { modelName });
            await loadModels(); // Refresh list
        } catch (e) {
            setError(String(e));
        } finally {
            setDeletingModel(null);
        }
    };

    const formatSize = (bytes: number | null) => {
        if (!bytes) return '';
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(0)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getFlag = (code: string) => {
        const map: Record<string, string> = {
            'en': '🇺🇸', 'zh': '🇨🇳', 'ja': '🇯🇵', 'ko': '🇰🇷',
            'es': '🇪🇸', 'fr': '🇫🇷', 'de': '🇩🇪', 'ru': '🇷🇺',
            'pt': '🇵🇹', 'it': '🇮🇹', 'ar': '🇸🇦', 'hi': '🇮🇳'
        };
        return map[code] || '🌐';
    };

    const getLangName = (code: string) => {
        const map: Record<string, string> = {
            'en': 'English', 'zh': 'Chinese', 'ja': 'Japanese', 'ko': 'Korean',
            'es': 'Spanish', 'fr': 'French', 'de': 'German', 'ru': 'Russian',
            'pt': 'Portuguese', 'it': 'Italian', 'ar': 'Arabic', 'hi': 'Hindi'
        };
        return map[code] || code;
    };

    // Filter models
    const filteredModels = models.filter(model =>
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.source_lang.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.target_lang.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const installedModels = filteredModels.filter(m => m.installed);
    const availableModels = filteredModels.filter(m => !m.installed);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-[#f5f2eb] border-2 border-[#0a0a0a] shadow-[8px_8px_0px_#0a0a0a] w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-[#0a0a0a] text-white p-4 flex justify-between items-center">
                        <div className="flex flex-col">
                            <h2 id="model-manager-title" className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                                <Languages size={20} />
                                {t('settings.translation.models_title') || 'Translation Models'}
                            </h2>
                            {downloadingModel && (
                                <span className="text-xs text-[#00ff88] animate-pulse flex items-center gap-1">
                                    <Loader2 size={10} className="animate-spin" />
                                    {t('status.downloading_model') || 'Downloading translation model...'}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="hover:text-[#00ff88] transition-colors"
                            aria-label="Close"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="p-4 border-b-2 border-[#0a0a0a]">
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0a0a0a]/50" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder={t('settings.models.search') || 'Search...'}
                                className="w-full pl-10 pr-4 py-2 bg-white border-2 border-[#0a0a0a] focus:outline-none focus:ring-2 focus:ring-[#00ff88]"
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="animate-spin" size={32} />
                            </div>
                        ) : (
                            <>
                                {error && (
                                    <div className="bg-red-100 border-2 border-red-500 text-red-700 p-3 text-sm">
                                        {error}
                                    </div>
                                )}

                                {/* Installed */}
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-[#0a0a0a]/50 mb-2">
                                        {t('settings.models.installed') || 'Installed'} ({installedModels.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {installedModels.length === 0 && (
                                            <div className="text-sm text-[#0a0a0a]/50 italic p-2">{t('settings.translation.no_model') || 'No models installed'}</div>
                                        )}
                                        {installedModels.map(model => (
                                            <div key={model.name} className="flex items-center justify-between p-3 bg-white border-2 border-[#0a0a0a]">
                                                <div className="flex items-center gap-3">
                                                    <Check size={18} className="text-green-600" />
                                                    <div>
                                                        <div className="font-bold flex items-center gap-2">
                                                            <span>{getFlag(model.source_lang)} {getLangName(model.source_lang)}</span>
                                                            <ArrowRight size={14} />
                                                            <span>{getFlag(model.target_lang)} {getLangName(model.target_lang)}</span>
                                                        </div>
                                                        <div className="text-xs text-[#0a0a0a]/50">
                                                            {model.name} • {formatSize(model.size_bytes)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDelete(model.name)}
                                                    disabled={deletingModel === model.name}
                                                    className="p-2 border-2 border-[#0a0a0a] bg-white hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                                                    title={t('settings.models.delete') || 'Delete'}
                                                >
                                                    {deletingModel === model.name ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Available */}
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-[#0a0a0a]/50 mb-2">
                                        {t('settings.models.available') || 'Available'} ({availableModels.length})
                                    </h3>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                        {availableModels.map(model => (
                                            <div key={model.name} className="flex items-center justify-between p-3 bg-white border-2 border-[#0a0a0a]/30">
                                                <div>
                                                    <div className="font-bold flex items-center gap-2">
                                                        <span>{getFlag(model.source_lang)} {getLangName(model.source_lang)}</span>
                                                        <ArrowRight size={14} />
                                                        <span>{getFlag(model.target_lang)} {getLangName(model.target_lang)}</span>
                                                    </div>
                                                    <div className="text-xs text-[#0a0a0a]/50">{model.name}</div>
                                                </div>
                                                <button
                                                    onClick={() => handleDownload(model.name)}
                                                    disabled={downloadingModel === model.name}
                                                    className="p-2 border-2 border-[#0a0a0a] bg-[#00ff88] hover:bg-[#0a0a0a] hover:text-[#00ff88] transition-colors disabled:opacity-50"
                                                    title={t('settings.models.download') || 'Download'}
                                                >
                                                    {downloadingModel === model.name ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="p-4 border-t-2 border-[#0a0a0a] bg-[#e8e4db]">
                        <p className="text-xs text-[#0a0a0a]/60 text-center">
                            Powered by MarianMT (OPUS) & Xenova
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

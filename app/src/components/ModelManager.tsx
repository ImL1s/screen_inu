import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Trash2, Check, Loader2, X, Globe, Search } from 'lucide-react';

interface ModelInfo {
    code: string;
    name: string;
    installed: boolean;
    size_bytes: number | null;
}

interface ModelManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ModelManager = ({ isOpen, onClose }: ModelManagerProps) => {
    const { t } = useTranslation();
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloadingLang, setDownloadingLang] = useState<string | null>(null);
    const [deletingLang, setDeletingLang] = useState<string | null>(null);
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
            const result = await invoke<ModelInfo[]>('list_ocr_models');
            setModels(result);
        } catch (e) {
            setError(String(e));
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (lang: string) => {
        setDownloadingLang(lang);
        setError(null);
        try {
            await invoke('download_ocr_model', { lang });
            await loadModels(); // Refresh list
        } catch (e) {
            setError(String(e));
        } finally {
            setDownloadingLang(null);
        }
    };

    const handleDelete = async (lang: string) => {
        setDeletingLang(lang);
        setError(null);
        try {
            await invoke('delete_ocr_model', { lang });
            await loadModels(); // Refresh list
        } catch (e) {
            setError(String(e));
        } finally {
            setDeletingLang(null);
        }
    };

    const formatSize = (bytes: number | null) => {
        if (!bytes) return '';
        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(0)} KB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Filter models by search query
    const filteredModels = models.filter(model =>
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Separate installed and available
    const installedModels = filteredModels.filter(m => m.installed);
    const availableModels = filteredModels.filter(m => !m.installed);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
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
                        <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                            <Globe size={20} />
                            {t('settings.models.title') || 'OCR Languages'}
                        </h2>
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
                                placeholder={t('settings.models.search') || 'Search languages...'}
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
                                        {installedModels.map(model => (
                                            <div
                                                key={model.code}
                                                className="flex items-center justify-between p-3 bg-white border-2 border-[#0a0a0a]"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Check size={18} className="text-green-600" />
                                                    <div>
                                                        <div className="font-bold">{model.name}</div>
                                                        <div className="text-xs text-[#0a0a0a]/50">
                                                            {model.code} {model.size_bytes && `• ${formatSize(model.size_bytes)}`}
                                                        </div>
                                                    </div>
                                                </div>
                                                {!['eng', 'osd'].includes(model.code) && (
                                                    <button
                                                        onClick={() => handleDelete(model.code)}
                                                        disabled={deletingLang === model.code}
                                                        className="p-2 border-2 border-[#0a0a0a] bg-white hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                                                        title={t('settings.models.delete') || 'Delete'}
                                                    >
                                                        {deletingLang === model.code ? (
                                                            <Loader2 size={16} className="animate-spin" />
                                                        ) : (
                                                            <Trash2 size={16} />
                                                        )}
                                                    </button>
                                                )}
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
                                            <div
                                                key={model.code}
                                                className="flex items-center justify-between p-3 bg-white border-2 border-[#0a0a0a]/30"
                                            >
                                                <div>
                                                    <div className="font-bold">{model.name}</div>
                                                    <div className="text-xs text-[#0a0a0a]/50">{model.code}</div>
                                                </div>
                                                <button
                                                    onClick={() => handleDownload(model.code)}
                                                    disabled={downloadingLang === model.code}
                                                    className="p-2 border-2 border-[#0a0a0a] bg-[#00ff88] hover:bg-[#0a0a0a] hover:text-[#00ff88] transition-colors disabled:opacity-50"
                                                    title={t('settings.models.download') || 'Download'}
                                                >
                                                    {downloadingLang === model.code ? (
                                                        <Loader2 size={16} className="animate-spin" />
                                                    ) : (
                                                        <Download size={16} />
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t-2 border-[#0a0a0a] bg-[#e8e4db]">
                        <p className="text-xs text-[#0a0a0a]/60 text-center">
                            {t('settings.models.source') || 'Source: tessdata_fast (GitHub)'}
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

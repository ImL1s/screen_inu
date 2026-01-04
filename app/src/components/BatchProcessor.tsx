import { useState, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion } from "framer-motion";
import { Layers, Upload, Copy, Loader2, X, AlertCircle, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BatchOcrResult {
    index: number;
    text: string | null;
    error: string | null;
}

interface BatchProcessorProps {
    ocrLang: string;
    ocrEngine: string;
    onClose: () => void;
}

export default function BatchProcessor({ ocrLang, ocrEngine, onClose }: BatchProcessorProps) {
    const { t } = useTranslation();
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [results, setResults] = useState<BatchOcrResult[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files).filter(f =>
            f.type.startsWith("image/")
        );
        if (droppedFiles.length > 0) {
            setFiles(droppedFiles);
        }
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files).filter(f =>
                f.type.startsWith("image/")
            );
            if (selectedFiles.length > 0) {
                setFiles(selectedFiles);
            }
        }
    }, []);

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const processImages = async () => {
        if (files.length === 0) return;

        setIsProcessing(true);
        setProgress({ current: 0, total: files.length });
        setResults([]);

        try {
            // Convert all files to base64
            const base64Images = await Promise.all(files.map(fileToBase64));

            // Call batch OCR
            const batchResults = await invoke<BatchOcrResult[]>("perform_batch_ocr", {
                images: base64Images,
                langs: ocrLang,
                engine: ocrEngine === "auto" ? null : ocrEngine,
            });

            setResults(batchResults.sort((a, b) => a.index - b.index));
            setProgress({ current: files.length, total: files.length });
        } catch (err) {
            console.error("Batch OCR failed:", err);
        } finally {
            setIsProcessing(false);
        }
    };

    const copyAllResults = () => {
        const allText = results
            .filter(r => r.text)
            .map(r => r.text)
            .join("\n\n---\n\n");
        navigator.clipboard.writeText(allText);
    };

    const clearAll = () => {
        setFiles([]);
        setResults([]);
        setProgress({ current: 0, total: 0 });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-zinc-900 border-4 border-amber-400 rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b-4 border-amber-400 bg-gradient-to-r from-amber-500 to-orange-500">
                    <div className="flex items-center gap-3">
                        <Layers className="w-7 h-7 text-zinc-900" />
                        <h2 className="text-2xl font-black text-zinc-900">{t("batch_mode")}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-black/20 transition-colors"
                    >
                        <X className="w-6 h-6 text-zinc-900" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 space-y-4">
                    {/* Drop Zone */}
                    {files.length === 0 && !isProcessing && (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-4 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${isDragging
                                ? "border-amber-400 bg-amber-400/10"
                                : "border-zinc-600 hover:border-amber-400/50"
                                }`}
                        >
                            <Upload className="w-16 h-16 mx-auto mb-4 text-amber-400" />
                            <p className="text-xl font-bold text-zinc-200">{t("batch_drop_hint")}</p>
                            <p className="text-sm text-zinc-500 mt-2">{t("batch_formats")}</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>
                    )}

                    {/* File List */}
                    {files.length > 0 && results.length === 0 && !isProcessing && (
                        <div className="space-y-3">
                            <p className="text-lg font-bold text-amber-400">
                                {files.length} {t("batch_files_selected")}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={processImages}
                                    className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-900 font-black py-3 rounded-xl hover:opacity-90 transition-opacity"
                                >
                                    {t("batch_start")}
                                </button>
                                <button
                                    onClick={clearAll}
                                    className="px-6 bg-zinc-700 text-zinc-200 font-bold py-3 rounded-xl hover:bg-zinc-600 transition-colors"
                                >
                                    {t("batch_clear")}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Processing */}
                    {isProcessing && (
                        <div className="text-center py-12">
                            <Loader2 className="w-16 h-16 mx-auto mb-4 text-amber-400 animate-spin" />
                            <p className="text-xl font-bold text-zinc-200">{t("batch_processing")}</p>
                            <p className="text-lg text-amber-400 mt-2">
                                {progress.current} / {progress.total}
                            </p>
                        </div>
                    )}

                    {/* Results */}
                    {results.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-lg font-bold text-amber-400">{t("batch_results")}</p>
                                <button
                                    onClick={copyAllResults}
                                    className="flex items-center gap-2 bg-amber-500 text-zinc-900 font-bold px-4 py-2 rounded-lg hover:bg-amber-400 transition-colors"
                                >
                                    <Copy className="w-4 h-4" />
                                    {t("copy_all")}
                                </button>
                            </div>
                            <div className="space-y-3 max-h-96 overflow-auto">
                                {results.map((result, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-4 rounded-xl border-2 ${result.error
                                            ? "border-red-500/50 bg-red-500/10"
                                            : "border-green-500/50 bg-green-500/10"
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            {result.error ? (
                                                <AlertCircle className="w-5 h-5 text-red-400" />
                                            ) : (
                                                <CheckCircle className="w-5 h-5 text-green-400" />
                                            )}
                                            <span className="font-bold text-zinc-200">
                                                {files[result.index]?.name || `Image ${result.index + 1}`}
                                            </span>
                                        </div>
                                        <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                                            {result.error || result.text || t("batch_no_text")}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={clearAll}
                                className="w-full bg-zinc-700 text-zinc-200 font-bold py-3 rounded-xl hover:bg-zinc-600 transition-colors"
                            >
                                {t("batch_new")}
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

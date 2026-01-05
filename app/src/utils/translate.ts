/**
 * Translation utility module
 * Supports both online (LibreTranslate API) and offline (local ONNX model) modes
 */

import { invoke } from '@tauri-apps/api/core';

export interface TranslateOptions {
    text: string;
    sourceLang?: string; // 'auto' for auto-detect (default)
    targetLang: string; // 'zh', 'en', 'ja', etc.
    apiUrl?: string; // Custom LibreTranslate server URL (online mode only)
    offlineMode?: boolean; // Use offline translation if available
}

export interface TranslateResult {
    translatedText: string;
    detectedSourceLang?: string;
    mode?: 'online' | 'offline';
}

export interface TranslationModelInfo {
    name: string;
    source_lang: string;
    target_lang: string;
    size_bytes: number;
    installed: boolean;
    download_url?: string;
}

// Default public LibreTranslate instance
const DEFAULT_API_URL = 'https://libretranslate.com';

// Language code mapping (LibreTranslate uses short codes)
const LANG_MAP: Record<string, string> = {
    'auto': 'auto',
    'en': 'en',
    'zh-TW': 'zh',
    'zh-CN': 'zh',
    'zh': 'zh',
    'ja': 'ja',
    'ko': 'ko',
    'es': 'es',
    'fr': 'fr',
    'de': 'de',
    'ru': 'ru',
    'pt': 'pt',
    'it': 'it',
    'ar': 'ar',
    'hi': 'hi',
};

/**
 * Translate text using offline ONNX model
 */
async function translateOffline(text: string, sourceLang: string, targetLang: string): Promise<TranslateResult> {
    try {
        const translatedText = await invoke<string>('translate_offline', {
            text,
            sourceLang: LANG_MAP[sourceLang] || sourceLang,
            targetLang: LANG_MAP[targetLang] || targetLang,
        });

        return {
            translatedText,
            mode: 'offline',
        };
    } catch (error) {
        console.error('Offline translation failed:', error);
        throw error;
    }
}

/**
 * Translate text using LibreTranslate API (online)
 */
async function translateOnline(text: string, sourceLang: string, targetLang: string, apiUrl: string): Promise<TranslateResult> {
    const source = LANG_MAP[sourceLang] || sourceLang;
    const target = LANG_MAP[targetLang] || targetLang;

    const response = await fetch(`${apiUrl}/translate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            q: text,
            source: source === 'auto' ? 'auto' : source,
            target: target,
            format: 'text',
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Translation API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
        translatedText: data.translatedText || '',
        detectedSourceLang: data.detectedLanguage?.language,
        mode: 'online',
    };
}

/**
 * Translate text (auto-selects online/offline based on availability)
 */
export async function translateText(options: TranslateOptions): Promise<TranslateResult> {
    const {
        text,
        sourceLang = 'auto',
        targetLang,
        apiUrl = DEFAULT_API_URL,
        offlineMode = false,
    } = options;

    if (!text.trim()) {
        return { translatedText: '' };
    }

    // Try offline first if requested
    if (offlineMode) {
        try {
            return await translateOffline(text, sourceLang, targetLang);
        } catch (error) {
            console.warn('Offline translation failed, falling back to online:', error);
            // Fall through to online
        }
    }

    // Online translation
    try {
        return await translateOnline(text, sourceLang, targetLang, apiUrl);
    } catch (error) {
        console.error('Translation failed:', error);
        throw error;
    }
}

/**
 * Get list of supported languages from LibreTranslate
 */
export async function getSupportedLanguages(apiUrl: string = DEFAULT_API_URL): Promise<{ code: string; name: string }[]> {
    try {
        const response = await fetch(`${apiUrl}/languages`);
        if (!response.ok) {
            throw new Error(`Failed to fetch languages: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Failed to get supported languages:', error);
        // Return default list as fallback
        return [
            { code: 'en', name: 'English' },
            { code: 'zh', name: 'Chinese' },
            { code: 'ja', name: 'Japanese' },
            { code: 'ko', name: 'Korean' },
            { code: 'es', name: 'Spanish' },
            { code: 'fr', name: 'French' },
            { code: 'de', name: 'German' },
        ];
    }
}

/**
 * Get list of available offline translation models
 */
export async function getTranslationModels(): Promise<TranslationModelInfo[]> {
    try {
        return await invoke<TranslationModelInfo[]>('list_translation_models');
    } catch (error) {
        console.error('Failed to get translation models:', error);
        return [];
    }
}

/**
 * Check if offline translation is available for a language pair
 */
export async function isOfflineAvailable(sourceLang: string, targetLang: string): Promise<boolean> {
    try {
        const models = await getTranslationModels();
        const src = LANG_MAP[sourceLang] || sourceLang;
        const tgt = LANG_MAP[targetLang] || targetLang;

        return models.some(m =>
            m.installed &&
            m.source_lang === src &&
            m.target_lang === tgt
        );
    } catch {
        return false;
    }
}

/**
 * Delete an offline translation model
 */
export async function deleteTranslationModel(modelName: string): Promise<void> {
    await invoke('delete_translation_model', { modelName });
}

// Common target languages for UI dropdown
export const COMMON_TARGET_LANGUAGES = [
    { code: 'zh', name: '繁體中文', flag: '🇹🇼' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

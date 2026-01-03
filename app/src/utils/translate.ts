/**
 * Translation utility module using LibreTranslate API
 * Provides text translation functionality for OCR results
 */

export interface TranslateOptions {
    text: string;
    sourceLang?: string; // 'auto' for auto-detect (default)
    targetLang: string; // 'zh-TW', 'en', 'ja', etc.
    apiUrl?: string; // Custom LibreTranslate server URL
}

export interface TranslateResult {
    translatedText: string;
    detectedSourceLang?: string;
}

// Default public LibreTranslate instance
const DEFAULT_API_URL = 'https://libretranslate.com';

// Language code mapping (LibreTranslate uses short codes)
const LANG_MAP: Record<string, string> = {
    'auto': 'auto',
    'en': 'en',
    'zh-TW': 'zh', // Traditional Chinese -> Chinese
    'zh-CN': 'zh',
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
 * Translate text using LibreTranslate API
 */
export async function translateText(options: TranslateOptions): Promise<TranslateResult> {
    const {
        text,
        sourceLang = 'auto',
        targetLang,
        apiUrl = DEFAULT_API_URL,
    } = options;

    if (!text.trim()) {
        return { translatedText: '' };
    }

    const source = LANG_MAP[sourceLang] || sourceLang;
    const target = LANG_MAP[targetLang] || targetLang;

    try {
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
        };
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

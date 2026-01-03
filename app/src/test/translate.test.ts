import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { translateText, getSupportedLanguages, COMMON_TARGET_LANGUAGES } from '../utils/translate';

describe('translate.ts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('translateText', () => {
        it('should return empty string for empty input', async () => {
            const result = await translateText({ text: '', targetLang: 'zh' });
            expect(result.translatedText).toBe('');
        });

        it('should return empty string for whitespace-only input', async () => {
            const result = await translateText({ text: '   ', targetLang: 'en' });
            expect(result.translatedText).toBe('');
        });

        it('should call LibreTranslate API with correct parameters', async () => {
            const mockResponse = { translatedText: '你好世界' };
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            } as Response);

            const result = await translateText({
                text: 'Hello World',
                sourceLang: 'en',
                targetLang: 'zh',
            });

            expect(fetch).toHaveBeenCalledWith(
                'https://libretranslate.com/translate',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: expect.stringContaining('"q":"Hello World"'),
                })
            );
            expect(result.translatedText).toBe('你好世界');
        });

        it('should use auto-detect when sourceLang is auto', async () => {
            const mockResponse = { translatedText: 'こんにちは', detectedLanguage: { language: 'en' } };
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            } as Response);

            const result = await translateText({
                text: 'Hello',
                sourceLang: 'auto',
                targetLang: 'ja',
            });

            expect(result.translatedText).toBe('こんにちは');
            expect(result.detectedSourceLang).toBe('en');
        });

        it('should use custom API URL when provided', async () => {
            const mockResponse = { translatedText: 'Bonjour' };
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse),
            } as Response);

            await translateText({
                text: 'Hello',
                targetLang: 'fr',
                apiUrl: 'https://my-libretranslate.com',
            });

            expect(fetch).toHaveBeenCalledWith(
                'https://my-libretranslate.com/translate',
                expect.any(Object)
            );
        });

        it('should throw error when API returns non-ok response', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: () => Promise.resolve('Internal Server Error'),
            } as Response);

            await expect(
                translateText({ text: 'Hello', targetLang: 'zh' })
            ).rejects.toThrow('Translation API error: 500');
        });

        it('should throw error when fetch fails', async () => {
            vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

            await expect(
                translateText({ text: 'Hello', targetLang: 'zh' })
            ).rejects.toThrow('Network error');
        });
    });

    describe('getSupportedLanguages', () => {
        it('should fetch languages from API', async () => {
            const mockLanguages = [
                { code: 'en', name: 'English' },
                { code: 'zh', name: 'Chinese' },
            ];
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockLanguages),
            } as Response);

            const result = await getSupportedLanguages();
            expect(result).toEqual(mockLanguages);
        });

        it('should return fallback list when API fails', async () => {
            vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

            const result = await getSupportedLanguages();
            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toHaveProperty('code');
            expect(result[0]).toHaveProperty('name');
        });
    });

    describe('COMMON_TARGET_LANGUAGES', () => {
        it('should contain expected languages', () => {
            expect(COMMON_TARGET_LANGUAGES.length).toBeGreaterThan(0);

            const codes = COMMON_TARGET_LANGUAGES.map(l => l.code);
            expect(codes).toContain('zh');
            expect(codes).toContain('en');
            expect(codes).toContain('ja');
        });

        it('should have code, name, and flag for each language', () => {
            COMMON_TARGET_LANGUAGES.forEach(lang => {
                expect(lang).toHaveProperty('code');
                expect(lang).toHaveProperty('name');
                expect(lang).toHaveProperty('flag');
                expect(typeof lang.code).toBe('string');
                expect(typeof lang.name).toBe('string');
                expect(typeof lang.flag).toBe('string');
            });
        });
    });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getHistory, addToHistory, clearHistory, deleteHistoryItem, exportHistory, importHistory, HistoryItem } from '../utils/history';

// Mock Tauri APIs
vi.mock('@tauri-apps/plugin-dialog', () => ({
    save: vi.fn(),
    open: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
    writeTextFile: vi.fn(),
    readTextFile: vi.fn(),
}));

import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';

describe('history.ts', () => {
    // Mock localStorage
    let store: Record<string, string> = {};

    beforeEach(() => {
        store = {};
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => store[key] || null,
            setItem: (key: string, value: string) => { store[key] = value; },
            removeItem: (key: string) => { delete store[key]; },
            clear: () => { store = {}; },
        });
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('getHistory', () => {
        it('should return empty array when no history exists', () => {
            const result = getHistory();
            expect(result).toEqual([]);
        });

        it('should return parsed history from localStorage', () => {
            const mockHistory: HistoryItem[] = [
                { id: '1', text: 'Hello', lang: 'en', timestamp: 1234567890 },
                { id: '2', text: 'World', lang: 'en', timestamp: 1234567891 },
            ];
            store['ocr_history'] = JSON.stringify(mockHistory);

            const result = getHistory();
            expect(result).toEqual(mockHistory);
        });

        it('should return empty array when localStorage contains invalid JSON', () => {
            store['ocr_history'] = 'invalid json';

            const result = getHistory();
            expect(result).toEqual([]);
        });
    });

    describe('addToHistory', () => {
        it('should add new item to the beginning of history', () => {
            addToHistory('Hello World', 'en');

            const history = getHistory();
            expect(history.length).toBe(1);
            expect(history[0].text).toBe('Hello World');
            expect(history[0].lang).toBe('en');
        });

        it('should not add empty text', () => {
            addToHistory('', 'en');
            addToHistory('   ', 'en');

            const history = getHistory();
            expect(history.length).toBe(0);
        });

        it('should trim whitespace from text', () => {
            addToHistory('  Hello World  ', 'en');

            const history = getHistory();
            expect(history[0].text).toBe('Hello World');
        });

        it('should add new items at the beginning', () => {
            addToHistory('First', 'en');
            addToHistory('Second', 'en');

            const history = getHistory();
            expect(history.length).toBe(2);
            expect(history[0].text).toBe('Second');
            expect(history[1].text).toBe('First');
        });

        it('should limit history to 20 items', () => {
            for (let i = 0; i < 25; i++) {
                addToHistory(`Item ${i}`, 'en');
            }

            const history = getHistory();
            expect(history.length).toBe(20);
            expect(history[0].text).toBe('Item 24'); // Most recent
        });

        it('should generate unique IDs for each item', () => {
            addToHistory('First', 'en');
            addToHistory('Second', 'en');

            const history = getHistory();
            expect(history[0].id).not.toBe(history[1].id);
        });

        it('should set timestamp to current time', () => {
            const before = Date.now();
            addToHistory('Test', 'en');
            const after = Date.now();

            const history = getHistory();
            expect(history[0].timestamp).toBeGreaterThanOrEqual(before);
            expect(history[0].timestamp).toBeLessThanOrEqual(after);
        });
    });

    describe('clearHistory', () => {
        it('should remove all history items', () => {
            addToHistory('First', 'en');
            addToHistory('Second', 'en');

            clearHistory();

            const history = getHistory();
            expect(history).toEqual([]);
        });
    });

    describe('deleteHistoryItem', () => {
        it('should delete specific item by ID', () => {
            addToHistory('First', 'en');
            addToHistory('Second', 'en');

            const history = getHistory();
            const idToDelete = history[0].id;

            deleteHistoryItem(idToDelete);

            const updatedHistory = getHistory();
            expect(updatedHistory.length).toBe(1);
            expect(updatedHistory[0].text).toBe('First');
        });

        it('should do nothing when ID does not exist', () => {
            addToHistory('First', 'en');

            deleteHistoryItem('non-existent-id');

            const history = getHistory();
            expect(history.length).toBe(1);
        });
    });

    describe('exportHistory', () => {
        it('should return false when history is empty', async () => {
            const result = await exportHistory();
            expect(result).toBe(false);
            expect(save).not.toHaveBeenCalled();
        });

        it('should return false when user cancels file dialog', async () => {
            addToHistory('Test', 'en');
            vi.mocked(save).mockResolvedValue(null);

            const result = await exportHistory();
            expect(result).toBe(false);
            expect(writeTextFile).not.toHaveBeenCalled();
        });

        it('should export history to selected file', async () => {
            addToHistory('Test Item', 'en');
            vi.mocked(save).mockResolvedValue('/path/to/export.json');
            vi.mocked(writeTextFile).mockResolvedValue(undefined);

            const result = await exportHistory();

            expect(result).toBe(true);
            expect(save).toHaveBeenCalledWith({
                filters: [{ name: 'JSON', extensions: ['json'] }],
                defaultPath: 'screen_inu_history.json'
            });
            expect(writeTextFile).toHaveBeenCalledWith(
                '/path/to/export.json',
                expect.stringContaining('Test Item')
            );
        });

        it('should return false on write error', async () => {
            addToHistory('Test', 'en');
            vi.mocked(save).mockResolvedValue('/path/to/export.json');
            vi.mocked(writeTextFile).mockRejectedValue(new Error('Write failed'));

            const result = await exportHistory();
            expect(result).toBe(false);
        });
    });

    describe('importHistory', () => {
        it('should return false when user cancels file dialog', async () => {
            vi.mocked(open).mockResolvedValue(null);

            const result = await importHistory();
            expect(result).toBe(false);
            expect(readTextFile).not.toHaveBeenCalled();
        });

        it('should return false when multiple files selected', async () => {
            vi.mocked(open).mockResolvedValue(['/file1.json', '/file2.json']);

            const result = await importHistory();
            expect(result).toBe(false);
        });

        it('should import valid history from file', async () => {
            const importedData: HistoryItem[] = [
                { id: 'imported-1', text: 'Imported Item', lang: 'en', timestamp: 1234567890 }
            ];
            vi.mocked(open).mockResolvedValue('/path/to/import.json');
            vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(importedData));

            const result = await importHistory();

            expect(result).toBe(true);
            const history = getHistory();
            expect(history.length).toBe(1);
            expect(history[0].text).toBe('Imported Item');
        });

        it('should merge imported history with existing history', async () => {
            addToHistory('Existing Item', 'en');
            const existingHistory = getHistory();

            const importedData: HistoryItem[] = [
                { id: 'imported-1', text: 'Imported Item', lang: 'en', timestamp: 1234567890 }
            ];
            vi.mocked(open).mockResolvedValue('/path/to/import.json');
            vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(importedData));

            await importHistory();

            const history = getHistory();
            expect(history.length).toBe(2);
            expect(history.some(h => h.text === 'Imported Item')).toBe(true);
            expect(history.some(h => h.id === existingHistory[0].id)).toBe(true);
        });

        it('should skip duplicate items by ID', async () => {
            addToHistory('First', 'en');
            const existingHistory = getHistory();
            const existingId = existingHistory[0].id;

            const importedData: HistoryItem[] = [
                { id: existingId, text: 'Duplicate', lang: 'en', timestamp: 1234567890 },
                { id: 'new-id', text: 'New Item', lang: 'en', timestamp: 1234567891 }
            ];
            vi.mocked(open).mockResolvedValue('/path/to/import.json');
            vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(importedData));

            await importHistory();

            const history = getHistory();
            expect(history.length).toBe(2);
            expect(history.some(h => h.text === 'First')).toBe(true);
            expect(history.some(h => h.text === 'New Item')).toBe(true);
            expect(history.some(h => h.text === 'Duplicate')).toBe(false);
        });

        it('should return false when no new items to import', async () => {
            addToHistory('First', 'en');
            const existingHistory = getHistory();
            const existingId = existingHistory[0].id;

            const importedData: HistoryItem[] = [
                { id: existingId, text: 'Same Item', lang: 'en', timestamp: 1234567890 }
            ];
            vi.mocked(open).mockResolvedValue('/path/to/import.json');
            vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(importedData));

            const result = await importHistory();
            expect(result).toBe(false);
        });

        it('should return false for invalid JSON format', async () => {
            vi.mocked(open).mockResolvedValue('/path/to/import.json');
            vi.mocked(readTextFile).mockResolvedValue('not a valid json');

            const result = await importHistory();
            expect(result).toBe(false);
        });

        it('should return false when file content is not an array', async () => {
            vi.mocked(open).mockResolvedValue('/path/to/import.json');
            vi.mocked(readTextFile).mockResolvedValue('{"key": "value"}');

            const result = await importHistory();
            expect(result).toBe(false);
        });

        it('should filter out invalid items (missing id or text)', async () => {
            const importedData = [
                { id: 'valid-1', text: 'Valid Item', lang: 'en', timestamp: 1234567890 },
                { text: 'No ID', lang: 'en', timestamp: 1234567891 },
                { id: 'no-text', lang: 'en', timestamp: 1234567892 },
            ];
            vi.mocked(open).mockResolvedValue('/path/to/import.json');
            vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(importedData));

            await importHistory();

            const history = getHistory();
            expect(history.length).toBe(1);
            expect(history[0].text).toBe('Valid Item');
        });
    });
});


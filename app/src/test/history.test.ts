import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getHistory, addToHistory, clearHistory, deleteHistoryItem, HistoryItem } from '../utils/history';

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
});

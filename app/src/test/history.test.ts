import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    getHistoryAsync,
    addToHistoryAsync,
    clearHistoryAsync,
    deleteHistoryItemAsync,
    exportHistory,
    importHistory,
    migrateToFileStorage
} from '../utils/history';

// Mock Settings (Critical to avoid tauri-plugin-store usage)
vi.mock('../utils/settings', () => ({
    getDataDirectory: vi.fn(),
    setDataDirectory: vi.fn(),
}));

import { getDataDirectory } from '../utils/settings';

// Mock Tauri APIs
vi.mock('@tauri-apps/plugin-dialog', () => ({
    save: vi.fn(),
    open: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
    writeTextFile: vi.fn(),
    readTextFile: vi.fn(),
    exists: vi.fn(),
    mkdir: vi.fn(),
}));

vi.mock('@tauri-apps/api/path', () => ({
    join: vi.fn((...args) => args.join('/')),
    appDataDir: vi.fn(() => Promise.resolve('/app/data')),
}));

import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';

describe('history.ts (Async)', () => {
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

        // Default: No custom directory (LocalStorage mode)
        vi.mocked(getDataDirectory).mockResolvedValue(null);

        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    // ============================================
    // LocalStorage Mode Tests (Default)
    // ============================================
    describe('LocalStorage Mode', () => {
        it('should get empty history initially', async () => {
            const result = await getHistoryAsync();
            expect(result).toEqual([]);
        });

        it('should add and retrieve items', async () => {
            await addToHistoryAsync('Hello', 'en');

            const history = await getHistoryAsync();
            expect(history.length).toBe(1);
            expect(history[0].text).toBe('Hello');
            expect(store['ocr_history']).toBeDefined();
        });

        it('should clear history', async () => {
            await addToHistoryAsync('Hello', 'en');
            await clearHistoryAsync();

            const history = await getHistoryAsync();
            expect(history).toEqual([]);
            expect(store['ocr_history']).toBeUndefined();
        });

        it('should delete specific item', async () => {
            await addToHistoryAsync('Item 1', 'en');
            await addToHistoryAsync('Item 2', 'en');

            const history = await getHistoryAsync();
            const idToDelete = history[0].id; // Item 2 (newest first)

            await deleteHistoryItemAsync(idToDelete);

            const updated = await getHistoryAsync();
            expect(updated.length).toBe(1);
            expect(updated[0].text).toBe('Item 1');
        });
    });

    // ============================================
    // File Storage Mode Tests (Custom Directory)
    // ============================================
    describe('File Storage Mode', () => {
        const MOCK_CUSTOM_DIR = '/custom/data';
        const MOCK_FILE_PATH = '/custom/data/ocr_history.json';

        beforeEach(() => {
            vi.mocked(getDataDirectory).mockResolvedValue(MOCK_CUSTOM_DIR);
            // Mock fs.exists to return false by default (file doesn't exist yet)
            vi.mocked(exists).mockResolvedValue(false);
            // Mock fs.readTextFile
            vi.mocked(readTextFile).mockResolvedValue('[]');
        });

        it('should use file system when custom directory is set', async () => {
            await getHistoryAsync();
            expect(getDataDirectory).toHaveBeenCalled();
            expect(exists).toHaveBeenCalledWith(MOCK_FILE_PATH);
        });

        it('should return empty array if file does not exist', async () => {
            vi.mocked(exists).mockResolvedValue(false);
            const result = await getHistoryAsync();
            expect(result).toEqual([]);
        });

        it('should read from file if exists', async () => {
            const mockData = [{ id: '1', text: 'File Item', lang: 'en', timestamp: 123 }];
            vi.mocked(exists).mockResolvedValue(true);
            vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(mockData));

            const result = await getHistoryAsync();
            expect(result).toEqual(mockData);
            expect(readTextFile).toHaveBeenCalledWith(MOCK_FILE_PATH);
        });

        it('should write to file when adding item', async () => {
            // Setup: Empty existing history
            vi.mocked(exists).mockResolvedValue(false);

            await addToHistoryAsync('New File Item', 'fr');

            expect(writeTextFile).toHaveBeenCalledWith(
                MOCK_FILE_PATH,
                expect.stringContaining('New File Item')
            );
            // Should verify that directory creation was attempted
            expect(mkdir).toHaveBeenCalled();
        });

        it('should clear history by writing empty array to file', async () => {
            await clearHistoryAsync();
            expect(writeTextFile).toHaveBeenCalledWith(MOCK_FILE_PATH, '[]');
        });
    });

    // ============================================
    // Migration Tests
    // ============================================
    describe('Migration', () => {
        it('should migrate from localStorage to file', async () => {
            // Setup LocalStorage data
            const mockData = [{ id: '1', text: 'LS Item', lang: 'en', timestamp: 1 }];
            store['ocr_history'] = JSON.stringify(mockData);

            // Mock switching to File Mode
            vi.mocked(getDataDirectory).mockResolvedValue('/new/dir');

            // We use the sync helper internally or we simulate the state where we still have access to LS
            // Since migration usually happens BEFORE switching the setting source of truth effectively, 
            // the test here is slightly artificial. The helper `migrateToFileStorage` reads from LS (sync) and writes to File (async).

            await migrateToFileStorage();

            expect(writeTextFile).toHaveBeenCalledWith(
                '/new/dir/ocr_history.json',
                JSON.stringify(mockData, null, 2)
            );
        });
    });

    // ============================================
    // Export/Import Tests (re-verified for async)
    // ============================================
    describe('Export/Import', () => {
        it('should export history (async source)', async () => {
            // Setup async history (LocalStorage mode)
            await addToHistoryAsync('Export Me', 'en');

            vi.mocked(save).mockResolvedValue('/export.json');

            const result = await exportHistory();

            expect(result).toBe(true);
            expect(writeTextFile).toHaveBeenCalledWith(
                '/export.json',
                expect.stringContaining('Export Me')
            );
        });

        it('should import history and merge (async)', async () => {
            // Setup existing
            await addToHistoryAsync('Existing', 'en');

            // Setup import file
            const importData = [{ id: 'new-1', text: 'Imported', lang: 'en', timestamp: 2 }];
            vi.mocked(open).mockResolvedValue('/import.json');
            vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(importData));

            const result = await importHistory();

            expect(result).toBe(true);
            const history = await getHistoryAsync();
            expect(history.length).toBe(2);
            expect(history.find(h => h.text === 'Imported')).toBeDefined();
        });
    });
});

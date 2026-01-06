import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile, exists, mkdir, watch } from '@tauri-apps/plugin-fs';
import { join, appDataDir } from '@tauri-apps/api/path';
import { getDataDirectory } from './settings';
import { cloudSync } from './sync';

/**
 * OCR History utility for Screen Inu
 * Supports both localStorage (default) and file-based storage (custom location) via Loro CRDT.
 */

const HISTORY_KEY = 'ocr_history';
const LEGACY_HISTORY_FILE = 'ocr_history.json';
const HISTORY_FILE = 'history.crdt';
const MAX_HISTORY_ITEMS = 20;

export interface HistoryItem {
    id: string;
    text: string;
    lang: string;
    timestamp: number;
}

// ========================================
// Internal Helpers
// ========================================

/**
 * Get the path to the history file (CRDT)
 */
async function getHistoryFilePath(): Promise<string> {
    const customDir = await getDataDirectory();
    const baseDir = customDir ?? await appDataDir();
    return join(baseDir, HISTORY_FILE);
}

async function getLegacyFilePath(): Promise<string> {
    const customDir = await getDataDirectory();
    const baseDir = customDir ?? await appDataDir();
    return join(baseDir, LEGACY_HISTORY_FILE);
}

/**
 * Ensure the data directory exists
 */
async function ensureDataDirectory(): Promise<void> {
    const customDir = await getDataDirectory();
    const baseDir = customDir ?? await appDataDir();

    try {
        const dirExists = await exists(baseDir);
        if (!dirExists) {
            await mkdir(baseDir, { recursive: true });
        }
    } catch (error) {
        console.error('Failed to create data directory:', error);
    }
}

// ========================================
// Async API (File-based or localStorage)
// ========================================

/**
 * Get all history items (async version)
 * Uses CRDT storage if custom directory is set, otherwise localStorage
 */
export async function getHistoryAsync(): Promise<HistoryItem[]> {
    try {
        const customDir = await getDataDirectory();

        if (customDir) {
            // CRDT storage
            await ensureDataDirectory();
            const filePath = await getHistoryFilePath();
            const fileExists = await exists(filePath);

            // Auto-Migration from Legacy JSON if CRDT missing
            if (!fileExists) {
                const legacyPath = await getLegacyFilePath();
                if (await exists(legacyPath)) {
                    console.log('Migrating legacy history to CRDT...');
                    try {
                        const content = await readTextFile(legacyPath);
                        const legacyItems = JSON.parse(content) as HistoryItem[];

                        // Initialize empty CRDT
                        await cloudSync.init(filePath);

                        // Add all items
                        for (const item of legacyItems) {
                            await cloudSync.addItem(item);
                        }
                    } catch (e) {
                        console.error('Migration failed:', e);
                    }
                }
            }

            // Init (idempotent-ish in logic, but safe to call)
            await cloudSync.init(filePath);
            return await cloudSync.getAllItems();
        } else {
            // localStorage fallback
            const data = localStorage.getItem(HISTORY_KEY);
            return data ? JSON.parse(data) : [];
        }
    } catch (error) {
        console.error('Failed to load history:', error);
        return [];
    }
}

/**
 * Add a new history item (async version)
 */
export async function addToHistoryAsync(text: string, lang: string): Promise<void> {
    if (!text || !text.trim()) return;

    const customDir = await getDataDirectory();
    const newItem: HistoryItem = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        text: text.trim(),
        lang,
        timestamp: Date.now(),
    };

    if (customDir) {
        // CRDT Mode
        await cloudSync.addItem(newItem);

        // Trim history if needed (Naive approach: get all, if > max, delete oldest)
        // Note: In CRDTs, deletion marks items as deleted (tombstones). 
        // Frequent deletion might grow document size. Loro handles this reasonably well.
        const items = await cloudSync.getAllItems();
        if (items.length > MAX_HISTORY_ITEMS) {
            const extra = items.length - MAX_HISTORY_ITEMS;
            // items are sorted by timestamp desc, so last items are oldest
            const toDelete = items.slice(items.length - extra);
            for (const item of toDelete) {
                await cloudSync.deleteItem(item.id);
            }
        }
    } else {
        // localStorage Mode
        const history = await getHistoryAsync(); // uses localStorage check inside
        const updated = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    }
}

/**
 * Clear all history (async version)
 */
export async function clearHistoryAsync(): Promise<void> {
    const customDir = await getDataDirectory();

    if (customDir) {
        // CRDT Mode: Delete all items
        const items = await cloudSync.getAllItems();
        for (const item of items) {
            await cloudSync.deleteItem(item.id);
        }
    } else {
        localStorage.removeItem(HISTORY_KEY);
    }
}

/**
 * Delete a specific history item (async version)
 */
export async function deleteHistoryItemAsync(id: string): Promise<void> {
    const customDir = await getDataDirectory();

    if (customDir) {
        await cloudSync.deleteItem(id);
    } else {
        const history = await getHistoryAsync();
        const updated = history.filter(item => item.id !== id);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    }
}

// ========================================
// Sync API (localStorage only - backward compatible)
// ========================================

/**
 * Get all history items (sync - localStorage only)
 * @deprecated Use getHistoryAsync for file-based storage support
 */
export function getHistory(): HistoryItem[] {
    try {
        const data = localStorage.getItem(HISTORY_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

/**
 * Add a new history item (sync - localStorage only)
 * @deprecated Use addToHistoryAsync for file-based storage support
 */
export function addToHistory(text: string, lang: string): void {
    if (!text || !text.trim()) return;

    const history = getHistory();
    const newItem: HistoryItem = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        text: text.trim(),
        lang,
        timestamp: Date.now(),
    };

    // Add to beginning, limit to max items
    const updated = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

/**
 * Clear all history (sync - localStorage only)
 * @deprecated Use clearHistoryAsync for file-based storage support
 */
export function clearHistory(): void {
    localStorage.removeItem(HISTORY_KEY);
}

/**
 * Delete a specific history item (sync - localStorage only)
 * @deprecated Use deleteHistoryItemAsync for file-based storage support
 */
export function deleteHistoryItem(id: string): void {
    const history = getHistory();
    const updated = history.filter(item => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

// ========================================
// Export/Import (File dialog based)
// ========================================

/**
 * Export history to a JSON file
 */
export async function exportHistory(): Promise<boolean> {
    try {
        const history = await getHistoryAsync();
        if (history.length === 0) return false;

        const filePath = await save({
            filters: [{
                name: 'JSON',
                extensions: ['json']
            }],
            defaultPath: 'screen_inu_history.json'
        });

        if (!filePath) return false;

        await writeTextFile(filePath, JSON.stringify(history, null, 2));
        return true;
    } catch (e) {
        console.error('Failed to export history:', e);
        return false;
    }
}

/**
 * Import history from a JSON file
 */
export async function importHistory(): Promise<boolean> {
    try {
        const filePath = await open({
            multiple: false,
            filters: [{
                name: 'JSON',
                extensions: ['json']
            }]
        });

        if (!filePath || Array.isArray(filePath)) return false;

        const content = await readTextFile(filePath);
        const importedHistory = JSON.parse(content);

        if (!Array.isArray(importedHistory)) {
            throw new Error('Invalid history format');
        }

        const customDir = await getDataDirectory();

        if (customDir) {
            // CRDT Mode Import
            for (const item of importedHistory) {
                if (item.id && item.text) {
                    // Check existence? CRDT handles idempotent adds if ID matches.
                    // But we should verify. 
                    // Just adding is safe if IDs are stable.
                    await cloudSync.addItem(item);
                }
            }
        } else {
            // localStorage Mode Import
            const currentHistory = getHistory();
            const currentIds = new Set(currentHistory.map(item => item.id));
            const newItems = importedHistory.filter(item =>
                item.id && item.text && !currentIds.has(item.id)
            );

            if (newItems.length === 0) return false;

            const updated = [...newItems, ...currentHistory].slice(0, MAX_HISTORY_ITEMS);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        }

        return true;
    } catch (e) {
        console.error('Failed to import history:', e);
        return false;
    }
}

// ========================================
// Migration Utilities
// ========================================

/**
 * Migrate history from localStorage to file storage
 * (Updated to use CRDT logic if destination is file)
 */
export async function migrateToFileStorage(): Promise<boolean> {
    try {
        const customDir = await getDataDirectory();
        if (!customDir) return false; // Should not happen if called correctly

        const localStorageHistory = getHistory();
        if (localStorageHistory.length === 0) return true;

        // Add all to CRDT
        for (const item of localStorageHistory) {
            await cloudSync.addItem(item);
        }
        return true;
    } catch (error) {
        console.error('Failed to migrate history:', error);
        return false;
    }
}

/**
 * Migrate history from file storage to localStorage
 */
export async function migrateToLocalStorage(): Promise<boolean> {
    try {
        const fileHistory = await getHistoryAsync(); // Gets from CRDT
        localStorage.setItem(HISTORY_KEY, JSON.stringify(fileHistory));
        return true;
    } catch (error) {
        console.error('Failed to migrate history:', error);
        return false;
    }
}

// ========================================
// Cloud Sync / File Watching
// ========================================

/**
 * Start watching the history file for changes (External Sync)
 * @param onUpdate Callback function to refresh data when file changes
 * @returns Unsubscribe function
 */
export async function startWatchingHistory(onUpdate: () => void): Promise<() => void> {
    const customDir = await getDataDirectory();

    // Only watch if we are using file storage (custom directory)
    if (!customDir) {
        return () => { };
    }

    try {
        const filePath = await getHistoryFilePath(); // Path to CRDT

        // Ensure initialized (redundant safety)
        await cloudSync.init(filePath);

        // Debounce mechanism
        let lastEvent = 0;
        const DEBOUNCE_MS = 1000; // Increased debounce for stability

        const unwatch = await watch(filePath, async (event) => { // async callback? watch might not support async callback properly if not awaited?
            // watch callback is void return usually.
            console.log('File watcher event:', event);

            const now = Date.now();
            if (now - lastEvent > DEBOUNCE_MS) {
                lastEvent = now;
                console.log('History CRDT changed externally, importing snapshot...');

                try {
                    // CRDT Merge Magic
                    await cloudSync.importSnapshot(filePath);
                    onUpdate();
                } catch (e) {
                    console.error('Failed to sync external changes:', e);
                }
            }
        });

        console.log(`Started watching history file at: ${filePath}`);
        return unwatch;
    } catch (e) {
        console.error('Failed to start file watcher:', e);
        return () => { };
    }
}

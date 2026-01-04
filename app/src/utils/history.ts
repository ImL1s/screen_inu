import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { join, appDataDir } from '@tauri-apps/api/path';
import { getDataDirectory } from './settings';

/**
 * OCR History utility for Screen Inu
 * Supports both localStorage (default) and file-based storage (custom location)
 */

const HISTORY_KEY = 'ocr_history';
const HISTORY_FILE = 'ocr_history.json';
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
 * Get the path to the history file
 */
async function getHistoryFilePath(): Promise<string> {
    const customDir = await getDataDirectory();
    const baseDir = customDir ?? await appDataDir();
    return join(baseDir, HISTORY_FILE);
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
 * Uses file storage if custom directory is set, otherwise localStorage
 */
export async function getHistoryAsync(): Promise<HistoryItem[]> {
    try {
        const customDir = await getDataDirectory();

        if (customDir) {
            // File-based storage
            const filePath = await getHistoryFilePath();
            const fileExists = await exists(filePath);

            if (!fileExists) {
                return [];
            }

            const content = await readTextFile(filePath);
            return JSON.parse(content) as HistoryItem[];
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
 * Save history to storage (internal)
 */
async function saveHistoryAsync(history: HistoryItem[]): Promise<void> {
    const customDir = await getDataDirectory();

    if (customDir) {
        // File-based storage
        await ensureDataDirectory();
        const filePath = await getHistoryFilePath();
        await writeTextFile(filePath, JSON.stringify(history, null, 2));
    } else {
        // localStorage fallback
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
}

/**
 * Add a new history item (async version)
 */
export async function addToHistoryAsync(text: string, lang: string): Promise<void> {
    if (!text || !text.trim()) return;

    const history = await getHistoryAsync();
    const newItem: HistoryItem = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        text: text.trim(),
        lang,
        timestamp: Date.now(),
    };

    // Add to beginning, limit to max items
    const updated = [newItem, ...history].slice(0, MAX_HISTORY_ITEMS);
    await saveHistoryAsync(updated);
}

/**
 * Clear all history (async version)
 */
export async function clearHistoryAsync(): Promise<void> {
    const customDir = await getDataDirectory();

    if (customDir) {
        await saveHistoryAsync([]);
    } else {
        localStorage.removeItem(HISTORY_KEY);
    }
}

/**
 * Delete a specific history item (async version)
 */
export async function deleteHistoryItemAsync(id: string): Promise<void> {
    const history = await getHistoryAsync();
    const updated = history.filter(item => item.id !== id);
    await saveHistoryAsync(updated);
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

        const currentHistory = await getHistoryAsync();

        // Merge history, avoiding duplicates by ID
        const currentIds = new Set(currentHistory.map(item => item.id));
        const newItems = importedHistory.filter(item =>
            item.id && item.text && !currentIds.has(item.id)
        );

        if (newItems.length === 0) return false;

        const updated = [...newItems, ...currentHistory].slice(0, MAX_HISTORY_ITEMS);
        await saveHistoryAsync(updated);

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
 */
export async function migrateToFileStorage(): Promise<boolean> {
    try {
        const localStorageHistory = getHistory();
        if (localStorageHistory.length === 0) return true;

        await saveHistoryAsync(localStorageHistory);
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
        const fileHistory = await getHistoryAsync();
        localStorage.setItem(HISTORY_KEY, JSON.stringify(fileHistory));
        return true;
    } catch (error) {
        console.error('Failed to migrate history:', error);
        return false;
    }
}

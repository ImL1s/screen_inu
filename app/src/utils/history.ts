import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';

/**
 * OCR History utility for Screen Inu
 * Stores and retrieves OCR history from localStorage
 */

const HISTORY_KEY = 'ocr_history';
const MAX_HISTORY_ITEMS = 20;

export interface HistoryItem {
    id: string;
    text: string;
    lang: string;
    timestamp: number;
}

/**
 * Get all history items
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
 * Add a new history item
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
 * Clear all history
 */
export function clearHistory(): void {
    localStorage.removeItem(HISTORY_KEY);
}

/**
 * Delete a specific history item
 */
export function deleteHistoryItem(id: string): void {
    const history = getHistory();
    const updated = history.filter(item => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

/**
 * Export history to a JSON file
 */
export async function exportHistory(): Promise<boolean> {
    try {
        const history = getHistory();
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

        const currentHistory = getHistory();

        // Merge history, avoiding duplicates by ID
        const currentIds = new Set(currentHistory.map(item => item.id));
        const newItems = importedHistory.filter(item =>
            item.id && item.text && !currentIds.has(item.id)
        );

        if (newItems.length === 0) return false;

        const updated = [...newItems, ...currentHistory].slice(0, MAX_HISTORY_ITEMS);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));

        return true;
    } catch (e) {
        console.error('Failed to import history:', e);
        return false;
    }
}

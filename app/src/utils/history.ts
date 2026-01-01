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

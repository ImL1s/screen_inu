import { load, Store } from '@tauri-apps/plugin-store';

const SETTINGS_FILE = 'settings.json';

export interface AppSettings {
    dataDirectory: string | null;  // null = use localStorage (default)
}

let storeInstance: Store | null = null;

/**
 * Get or create the store instance
 */
async function getStore(): Promise<Store> {
    if (!storeInstance) {
        storeInstance = await load(SETTINGS_FILE, { autoSave: true, defaults: { dataDirectory: null } });
    }
    return storeInstance;
}

/**
 * Get all app settings
 */
export async function getSettings(): Promise<AppSettings> {
    try {
        const store = await getStore();
        const dataDirectory = await store.get<string | null>('dataDirectory');
        return {
            dataDirectory: dataDirectory ?? null,
        };
    } catch (error) {
        console.error('Failed to load settings:', error);
        return { dataDirectory: null };
    }
}

/**
 * Set the custom data directory path
 * @param path - The custom directory path, or null to use default localStorage
 */
export async function setDataDirectory(path: string | null): Promise<void> {
    try {
        const store = await getStore();
        await store.set('dataDirectory', path);
        await store.save();
    } catch (error) {
        console.error('Failed to save data directory setting:', error);
        throw error;
    }
}

/**
 * Get the current data directory path
 * @returns The custom directory path if set, or null for localStorage
 */
export async function getDataDirectory(): Promise<string | null> {
    const settings = await getSettings();
    return settings.dataDirectory;
}

/**
 * Check if using custom data location
 */
export async function isUsingCustomLocation(): Promise<boolean> {
    const dataDir = await getDataDirectory();
    return dataDir !== null;
}

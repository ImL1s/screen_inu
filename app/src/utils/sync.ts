import { invoke } from "@tauri-apps/api/core";
import { HistoryItem } from "./history";

export const cloudSync = {
    async init(path: string): Promise<void> {
        await invoke('sync_init', { path });
    },

    async addItem(item: HistoryItem): Promise<void> {
        await invoke('sync_add_item', { item });
    },

    async deleteItem(id: string): Promise<void> {
        await invoke('sync_delete_item', { id });
    },

    async getAllItems(): Promise<HistoryItem[]> {
        return await invoke('sync_get_all');
    },

    async importSnapshot(path: string): Promise<void> {
        await invoke('sync_import_snapshot', { path });
    }
};

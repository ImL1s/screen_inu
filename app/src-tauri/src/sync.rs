use std::sync::Mutex;
use std::path::PathBuf;
use std::fs;
use once_cell::sync::Lazy;
use loro::{LoroDoc, LoroValue, LoroMap, ExportMode, LoroError};
use serde::{Deserialize, Serialize};

// Singleton to hold the LoroDoc in memory
// We use a Mutex to ensure thread safety
static SYNC_MANAGER: Lazy<Mutex<Option<SyncManager>>> = Lazy::new(|| Mutex::new(None));

pub struct SyncManager {
    doc: LoroDoc,
    file_path: PathBuf,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct HistoryItem {
    pub id: String,
    pub text: String,
    pub timestamp: i64,
    pub lang: String,
}

impl SyncManager {
    pub fn new(path: PathBuf) -> Result<Self, String> {
        let doc = LoroDoc::new();
        
        let manager = SyncManager {
            doc,
            file_path: path,
        };
        
        // Try to load existing snapshot
        if manager.file_path.exists() {
            manager.load_from_disk()?;
        }
        
        Ok(manager)
    }

    fn load_from_disk(&self) -> Result<(), String> {
        let bytes = fs::read(&self.file_path).map_err(|e| e.to_string())?;
        if !bytes.is_empty() {
             self.doc.import(&bytes).map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    fn save_to_disk(&self) -> Result<(), String> {
        // Use ExportMode::Snapshot for full state
        let bytes = self.doc.export(ExportMode::Snapshot).map_err(|e| e.to_string())?;
        fs::write(&self.file_path, bytes).map_err(|e| e.to_string())?;
        Ok(())
    }
    
    pub fn add_item(&self, item: HistoryItem) -> Result<(), String> {
        let history = self.doc.get_map("history");
        
        // Insert a new map container for the item
        let item_map = history.insert_container(&item.id, LoroMap::new()).map_err(|e| e.to_string())?;
        
        item_map.insert("text", item.text.as_str()).map_err(|e: LoroError| e.to_string())?;
        item_map.insert("timestamp", item.timestamp as f64).map_err(|e: LoroError| e.to_string())?;
        item_map.insert("lang", item.lang.as_str()).map_err(|e: LoroError| e.to_string())?;
        item_map.insert("id", item.id.as_str()).map_err(|e: LoroError| e.to_string())?;
        
        self.save_to_disk()?;
        Ok(())
    }
    
    pub fn delete_item(&self, id: &str) -> Result<(), String> {
        let history = self.doc.get_map("history");
        history.delete(id).map_err(|e: LoroError| e.to_string())?;
        self.save_to_disk()?;
        Ok(())
    }
    
    pub fn get_all_items(&self) -> Result<Vec<HistoryItem>, String> {
        let history = self.doc.get_map("history");
        let value = history.get_value();
        // Force deep value to ensure we get a Map not a Container handler
        // value is already the LoroValue enum

        // value is already the LoroValue enum
        
        let mut items = Vec::new();
        
        if let LoroValue::Map(map) = value {
             // map is Arc<HashMap> or similar. Use iter() if possible.
             for (id, val) in map.iter() {
                 
                 // Handle Container variant (shallow reference)
                 
                 // Handle Container variant (shallow reference)
                 let fields_map = if let LoroValue::Container(c) = val {
                     let child_map = self.doc.get_map(c);
                     let v = child_map.get_value();
                     if let LoroValue::Map(m) = v { Some(m) } else { None }
                 } else if let LoroValue::Map(m) = val {
                     Some(m.clone())
                 } else {
                     None
                 };

                 if let Some(item_map) = fields_map {
                     // Helper to extract string from LoroValue map
                     let get_str = |k: &str| -> String {
                         item_map.get(k).and_then(|v| {
                             match v {
                                 LoroValue::String(s) => Some(s.to_string()),
                                 _ => None
                             }
                         }).unwrap_or_default()
                     };
                     
                     let get_i64 = |k: &str| -> i64 {
                         item_map.get(k).and_then(|v| {
                             match v {
                                 LoroValue::Double(d) => Some(*d as i64),
                                 LoroValue::I64(i) => Some(*i),
                                 _ => None
                             }
                         }).unwrap_or(0)
                     };

                     items.push(HistoryItem {
                         id: id.to_string(),
                         text: get_str("text"),
                         timestamp: get_i64("timestamp"),
                         lang: get_str("lang"),
                     });
                 }
             }
        }
        
        // Sort by timestamp desc
        items.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        
        Ok(items)
    }

    pub fn import_snapshot(&self, bytes: Vec<u8>) -> Result<(), String> {
        self.doc.import(&bytes).map_err(|e| e.to_string())?;
        // No need to save manually, import usually updates state. 
        // But for persistence we should save.
        self.save_to_disk()?;
        Ok(())
    }
}

// ================= Tauri Commands =================

#[tauri::command]
pub fn sync_init(path: String) -> Result<String, String> {
    let mut guard = SYNC_MANAGER.lock().map_err(|e| e.to_string())?;

    // CRITICAL: Check for Test Mode to isolate data
    if let Ok(test_dir) = std::env::var("SCREEN_INU_TEST_DIR") {
        println!("[TEST MODE] Override sync path to: {}", test_dir);
        let mut test_path = PathBuf::from(test_dir);
        if !test_path.exists() {
             fs::create_dir_all(&test_path).map_err(|e| e.to_string())?;
        }
        test_path.push("history.crdt");
        
        let manager = SyncManager::new(test_path)?;
        *guard = Some(manager);
        return Ok("Initialized (Test Mode)".to_string());
    }
    
    let path_buf = PathBuf::from(path);
    if let Some(parent) = path_buf.parent() {
        if !parent.exists() {
             fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    
    let manager = SyncManager::new(path_buf)?;
    *guard = Some(manager);
    
    Ok("Initialized".to_string())
}

#[tauri::command]
pub fn sync_add_item(item: HistoryItem) -> Result<(), String> {
    let guard = SYNC_MANAGER.lock().map_err(|e| e.to_string())?;
    let manager = guard.as_ref().ok_or("Sync manager not initialized")?;
    manager.add_item(item)
}

#[tauri::command]
pub fn sync_delete_item(id: String) -> Result<(), String> {
    let guard = SYNC_MANAGER.lock().map_err(|e| e.to_string())?;
    let manager = guard.as_ref().ok_or("Sync manager not initialized")?;
    manager.delete_item(&id)
}

#[tauri::command]
pub fn sync_get_all() -> Result<Vec<HistoryItem>, String> {
    let guard = SYNC_MANAGER.lock().map_err(|e| e.to_string())?;
    let manager = guard.as_ref().ok_or("Sync manager not initialized")?;
    manager.get_all_items()
}

#[tauri::command]
pub fn sync_import_snapshot(path: String) -> Result<(), String> {
    // This command is meant to read an external snapshot file and merge it
    let mut guard = SYNC_MANAGER.lock().map_err(|e| e.to_string())?;
    let manager = guard.as_ref().ok_or("Sync manager not initialized")?;
    
    // Read the file 
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    manager.import_snapshot(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_sync_manager_flow() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("history.crdt");
        
        let manager = SyncManager::new(file_path.clone()).expect("Failed to init manager");
        
        let item1 = HistoryItem {
            id: "item1".to_string(),
            text: "Hello".to_string(),
            lang: "eng".to_string(),
            timestamp: 100,
        };
        
        manager.add_item(item1.clone()).expect("Failed to add item");
        
        // precise verification
        let items = manager.get_all_items().expect("Failed to get items");
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].text, "Hello");
        
        // persistence check
        let manager2 = SyncManager::new(file_path).expect("Failed to reload manager");
        let items2 = manager2.get_all_items().expect("Failed to get items 2");
        assert_eq!(items2.len(), 1);
        assert_eq!(items2[0].id, "item1");
    }

    #[test]
    fn test_merge_conflict() {
        let dir = tempdir().unwrap();
        let file_path_a = dir.path().join("history_a.crdt");
        let file_path_b = dir.path().join("history_b.crdt");
        
        let manager_a = SyncManager::new(file_path_a.clone()).unwrap();
        let manager_b = SyncManager::new(file_path_b.clone()).unwrap();
        
        // Instance A adds "Dog"
        manager_a.add_item(HistoryItem {
            id: "dog".to_string(),
            text: "Dog".to_string(),
            lang: "eng".to_string(),
            timestamp: 100,
        }).unwrap();
        
        // Instance B adds "Cat"
        manager_b.add_item(HistoryItem {
            id: "cat".to_string(),
            text: "Cat".to_string(),
            lang: "eng".to_string(),
            timestamp: 200,
        }).unwrap();
        
        // Export B
        let snapshot_b = manager_b.doc.export(ExportMode::Snapshot).unwrap();
        // Merge into A
        manager_a.import_snapshot(snapshot_b).unwrap();
        
        // Verify A has both
        let items_a = manager_a.get_all_items().unwrap();
        assert_eq!(items_a.len(), 2, "Merged should have 2 items");
        let texts: Vec<String> = items_a.iter().map(|i| i.text.clone()).collect();
        assert!(texts.contains(&"Dog".to_string()));
        assert!(texts.contains(&"Cat".to_string()));
    }
}

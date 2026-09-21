import { DiagnosticResult } from '../types';

export interface StoredScan extends DiagnosticResult {
  thumbnailUrl?: string;
  notes?: string;
}

const DB_NAME = 'DermAIScanHistoryDB';
const DB_VERSION = 1;
const STORE_NAME = 'scans';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveScanToHistory(scan: StoredScan): Promise<number> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(scan);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Failed to save scan to IndexedDB history:', error);
    return -1;
  }
}

export async function getAllScans(): Promise<StoredScan[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result as StoredScan[]) || [];
        // Sort descending by created_at
        results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Failed to retrieve scans from IndexedDB:', error);
    return [];
  }
}

export async function deleteScan(id: number): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Failed to delete scan from IndexedDB:', error);
  }
}

export async function clearAllScans(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Failed to clear IndexedDB history:', error);
  }
}

import type { Track } from "../types";

const DATABASE = "galada-local-audio:v1";
const STORE = "tracks";

export interface StoredAudio {
  id: string;
  track: Omit<Track, "src">;
  file: Blob;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error("IndexedDB indisponível"));
      return;
    }
    const request = indexedDB.open(DATABASE, 1);
    let blocked = false;
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(new Error("Feche outras abas da Galada e tente novamente."));
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      if (blocked) database.close();
      else resolve(database);
    };
  });
}

async function transaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = database.transaction(STORE, mode);
      const request = operation(tx.objectStore(STORE));
      tx.oncomplete = () => {
        database.close();
        resolve(request.result);
      };
      tx.onabort = () => {
        database.close();
        reject(tx.error ?? request.error ?? new Error("Falha no armazenamento local"));
      };
    } catch (error) {
      database.close();
      reject(error);
    }
  });
}

export function loadLocalAudio(): Promise<StoredAudio[]> {
  return transaction("readonly", store => store.getAll());
}

export async function saveLocalAudio(track: Track, file: File): Promise<void> {
  // Object URLs only belong to the current document. Persist bytes and metadata instead.
  const { src: _src, ...metadata } = track;
  await transaction("readwrite", store => store.put({ id: track.id, track: metadata, file } satisfies StoredAudio));
}

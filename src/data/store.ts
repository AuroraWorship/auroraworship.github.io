/**
 * Almacenamiento clave-valor.
 *
 * Una interfaz mínima con tres implementaciones: IndexedDB en el navegador,
 * localStorage como respaldo, y memoria para las pruebas. El repositorio no
 * sabe cuál está usando.
 *
 * Se elige IndexedDB y no solo localStorage porque el techo de ~5 MB de
 * localStorage se alcanza en cuanto entren pistas, audios de voces o PDF; y
 * porque la sincronización futura necesitará transacciones.
 */

export interface KeyValueStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  keys(): Promise<readonly string[]>;
}

/** Implementación para pruebas y para entornos sin navegador. */
export class MemoryStore implements KeyValueStore {
  private readonly data = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    return (this.data.get(key) as T) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    // Se clona para que quien guardó no pueda mutar lo guardado por accidente.
    this.data.set(key, structuredClone(value));
  }

  async remove(key: string): Promise<void> {
    this.data.delete(key);
  }

  async keys(): Promise<readonly string[]> {
    return [...this.data.keys()];
  }
}

const PREFIX = 'aurora:';

export class LocalStorageStore implements KeyValueStore {
  async get<T>(key: string): Promise<T | null> {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // Un valor corrupto no debe tumbar la aplicación: se trata como ausente.
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(PREFIX + key);
  }

  async keys(): Promise<readonly string[]> {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .map((k) => k.slice(PREFIX.length));
  }
}

const DB_NAME = 'aurora';
const DB_VERSION = 1;
const STORE_NAME = 'kv';

export class IndexedDbStore implements KeyValueStore {
  private db: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (!this.db) {
      this.db = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(STORE_NAME)) {
            request.result.createObjectStore(STORE_NAME);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return this.db;
  }

  private async run<T>(
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest,
  ): Promise<T> {
    const db = await this.open();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const request = action(tx.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    return (await this.run<T | undefined>('readonly', (s) => s.get(key))) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.run('readwrite', (s) => s.put(value, key));
  }

  async remove(key: string): Promise<void> {
    await this.run('readwrite', (s) => s.delete(key));
  }

  async keys(): Promise<readonly string[]> {
    const keys = await this.run<IDBValidKey[]>('readonly', (s) => s.getAllKeys());
    return keys.map(String);
  }
}

/**
 * Elige el mejor almacenamiento disponible.
 *
 * El orden importa: IndexedDB puede estar deshabilitado en navegación privada
 * de algunos navegadores, y entonces localStorage sigue sirviendo.
 */
export function createDefaultStore(): KeyValueStore {
  try {
    if (typeof indexedDB !== 'undefined') return new IndexedDbStore();
  } catch {
    // Sigue al respaldo.
  }
  try {
    if (typeof localStorage !== 'undefined') return new LocalStorageStore();
  } catch {
    // Sigue al respaldo.
  }
  return new MemoryStore();
}

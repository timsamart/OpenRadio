/**
 * Local persistence — PRD §24.
 *
 * IndexedDB holds anything the user created (favorites, history, play stats)
 * plus the catalog snapshot. localStorage holds only tiny UI preferences.
 * Everything is versioned so a future schema change can migrate rather than
 * wipe: catalog failure must never destroy cached favorites (guardrail 7),
 * and neither may an upgrade.
 */

const DB_NAME = 'openradio';
const DB_VERSION = 1;

export const STORE = {
  favorites: 'favorites',
  history: 'history',
  stats: 'stats',
  catalog: 'catalog',
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // v1 schema. Add branches, never rewrite, when DB_VERSION rises.
      if (!db.objectStoreNames.contains(STORE.favorites)) {
        db.createObjectStore(STORE.favorites, { keyPath: 'stationId' });
      }
      if (!db.objectStoreNames.contains(STORE.history)) {
        const s = db.createObjectStore(STORE.history, { keyPath: 'at' });
        s.createIndex('stationId', 'stationId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE.stats)) {
        db.createObjectStore(STORE.stats, { keyPath: 'stationId' });
      }
      if (!db.objectStoreNames.contains(STORE.catalog)) {
        db.createObjectStore(STORE.catalog, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
  return dbPromise;
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
      }),
  );
}

export const idb = {
  getAll<T>(store: string): Promise<T[]> {
    return run<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>).catch(() => []);
  },
  get<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
    return run<T | undefined>(store, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>).catch(
      () => undefined,
    );
  },
  put<T>(store: string, value: T): Promise<unknown> {
    return run(store, 'readwrite', (s) => s.put(value as never)).catch(() => undefined);
  },
  del(store: string, key: IDBValidKey): Promise<unknown> {
    return run(store, 'readwrite', (s) => s.delete(key)).catch(() => undefined);
  },
  clear(store: string): Promise<unknown> {
    return run(store, 'readwrite', (s) => s.clear()).catch(() => undefined);
  },
};

/* ------------------------------------------------------------ preferences */

export type ThemePref = 'system' | 'light' | 'dark';
export type LangPref = 'el' | 'en' | 'de';

interface Prefs {
  theme: ThemePref;
  lang: LangPref;
  sleepDefault: number;
  dismissedHints: string[];
}

const PREFS_KEY = 'openradio.prefs.v1';

const DEFAULT_PREFS: Prefs = {
  theme: 'system',
  lang: 'el',
  sleepDefault: 30,
  dismissedHints: [],
};

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS, lang: detectLang() };
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* private mode / quota — preferences are not worth failing a session over */
  }
}

function detectLang(): LangPref {
  const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'el';
  return nav === 'de' ? 'de' : nav === 'el' ? 'el' : 'en';
}

export type { Prefs };

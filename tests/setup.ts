const store = new Map<string, unknown>();
const listeners: Array<(changes: Record<string, chrome.storage.StorageChange>, area: string) => void> = [];

const local = {
  get: async (keys?: string | string[] | null): Promise<Record<string, unknown>> => {
    if (keys == null) return Object.fromEntries(store);
    const arr = Array.isArray(keys) ? keys : [keys];
    return Object.fromEntries(arr.filter((k) => store.has(k)).map((k) => [k, store.get(k)]));
  },
  set: async (items: Record<string, unknown>): Promise<void> => {
    const changes: Record<string, chrome.storage.StorageChange> = {};
    for (const [k, newValue] of Object.entries(items)) {
      changes[k] = { oldValue: store.get(k), newValue };
      store.set(k, newValue);
    }
    listeners.forEach((fn) => fn(changes, 'local'));
  },
  remove: async (keys: string | string[]): Promise<void> => {
    const arr = Array.isArray(keys) ? keys : [keys];
    const changes: Record<string, chrome.storage.StorageChange> = {};
    for (const k of arr) {
      if (store.has(k)) {
        changes[k] = { oldValue: store.get(k), newValue: undefined };
        store.delete(k);
      }
    }
    listeners.forEach((fn) => fn(changes, 'local'));
  },
  clear: async (): Promise<void> => {
    store.clear();
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).chrome = {
  storage: {
    local: local as any,
    onChanged: {
      addListener: (fn: typeof listeners[number]) => listeners.push(fn),
      removeListener: (fn: typeof listeners[number]) => {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      },
    } as any,
  },
};

// Reset between tests
beforeEach(() => {
  store.clear();
  listeners.length = 0;
});

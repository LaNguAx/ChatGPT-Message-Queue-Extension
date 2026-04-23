import { LOCK_STALE_MS, STORAGE_KEY_LOCK, TabLock } from '../queue/types';

async function readLock(): Promise<TabLock | undefined> {
  const obj = await chrome.storage.local.get(STORAGE_KEY_LOCK);
  return obj[STORAGE_KEY_LOCK] as TabLock | undefined;
}

export async function acquireLock(tabId: string): Promise<boolean> {
  const now = Date.now();
  const existing = await readLock();
  const fresh = existing && now - existing.heartbeatAt < LOCK_STALE_MS;
  if (fresh && existing && existing.tabId !== tabId) return false;
  const lock: TabLock = { tabId, heartbeatAt: now };
  await chrome.storage.local.set({ [STORAGE_KEY_LOCK]: lock });
  return true;
}

export async function heartbeat(tabId: string): Promise<void> {
  const existing = await readLock();
  if (!existing || existing.tabId !== tabId) return;
  await chrome.storage.local.set({ [STORAGE_KEY_LOCK]: { tabId, heartbeatAt: Date.now() } });
}

export async function isOwner(tabId: string): Promise<boolean> {
  const existing = await readLock();
  if (!existing) return false;
  if (existing.tabId !== tabId) return false;
  return Date.now() - existing.heartbeatAt < LOCK_STALE_MS;
}

export async function releaseLock(tabId: string): Promise<void> {
  const existing = await readLock();
  if (existing && existing.tabId === tabId) {
    await chrome.storage.local.remove(STORAGE_KEY_LOCK);
  }
}

export function onLockChange(fn: (lock: TabLock | undefined) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== 'local') return;
    const ch = changes[STORAGE_KEY_LOCK];
    if (!ch) return;
    fn(ch.newValue as TabLock | undefined);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

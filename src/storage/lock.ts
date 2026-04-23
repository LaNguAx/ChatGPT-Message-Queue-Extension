import { LOCK_STALE_MS, STORAGE_KEY_LOCK, TabLock } from '../queue/types';

async function readLock(): Promise<TabLock | undefined> {
  const obj = await chrome.storage.local.get(STORAGE_KEY_LOCK);
  return obj[STORAGE_KEY_LOCK] as TabLock | undefined;
}

// Age of a heartbeat, clamped to [0, +inf) to survive OS clock jumps.
function ageOf(now: number, heartbeatAt: number): number {
  return Math.max(0, now - heartbeatAt);
}

// Optimistic lock acquisition. Returns true if we believe we now own the lock.
// Because chrome.storage reads and writes are not a single atomic compare-and-swap,
// two concurrent tabs can both observe "no fresh owner" and both write themselves.
// Callers MUST subscribe to onLockChange and yield to whichever tabId lands last.
export async function acquireLock(tabId: string): Promise<boolean> {
  const now = Date.now();
  const existing = await readLock();
  if (existing && ageOf(now, existing.heartbeatAt) < LOCK_STALE_MS && existing.tabId !== tabId) {
    return false;
  }
  await chrome.storage.local.set({ [STORAGE_KEY_LOCK]: { tabId, heartbeatAt: now } satisfies TabLock });
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
  return ageOf(Date.now(), existing.heartbeatAt) < LOCK_STALE_MS;
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

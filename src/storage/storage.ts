import { DEFAULT_STATE, QueueState, STORAGE_KEY_STATE } from '../queue/types';

export async function loadState(): Promise<QueueState> {
  const obj = await chrome.storage.local.get(STORAGE_KEY_STATE);
  const raw = obj[STORAGE_KEY_STATE] as QueueState | undefined;
  if (!raw) return { ...DEFAULT_STATE };
  const items = Array.isArray(raw.items) ? raw.items : [];
  // Any item left in 'sending' from a previous session never completed
  // (the content script was torn down before the detector's idle fired).
  // Reset to 'pending' so the user can resume, and so the item isn't stuck
  // without a Remove button (the UI hides Remove on sending items).
  for (const it of items) {
    if (it && it.status === 'sending') it.status = 'pending';
  }
  return {
    items,
    running: false, // per spec: persist but start paused
    delayMs: typeof raw.delayMs === 'number' ? raw.delayMs : DEFAULT_STATE.delayMs,
    currentId: undefined,
  };
}

export async function saveState(state: QueueState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_STATE]: state });
}

export function onStateChange(fn: (state: QueueState) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== 'local') return;
    const change = changes[STORAGE_KEY_STATE];
    if (!change) return;
    if (change.newValue) fn(change.newValue as QueueState);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

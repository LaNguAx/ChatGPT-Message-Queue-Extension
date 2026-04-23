import { DEFAULT_STATE, QueueState, STORAGE_KEY_STATE } from '../queue/types';

export async function loadState(): Promise<QueueState> {
  const obj = await chrome.storage.local.get(STORAGE_KEY_STATE);
  const raw = obj[STORAGE_KEY_STATE] as QueueState | undefined;
  if (!raw) return { ...DEFAULT_STATE };
  return {
    items: Array.isArray(raw.items) ? raw.items : [],
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

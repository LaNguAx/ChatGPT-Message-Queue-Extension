import { DEFAULT_STATE, QueueState, STORAGE_KEY_STATE } from '../queue/types';

// Queue state lives in sessionStorage, which is scoped per-tab by the browser.
// Each ChatGPT tab has its own independent queue; they never share storage.
// Storage survives page refresh within the tab but is cleared on tab close.
 
export async function loadState(): Promise<QueueState> {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY_STATE);
  } catch {
    return { ...DEFAULT_STATE };
  }
  if (!raw) return { ...DEFAULT_STATE };
  let parsed: QueueState;
  try {
    parsed = JSON.parse(raw) as QueueState;
  } catch {
    return { ...DEFAULT_STATE };
  }
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  // Any item left in 'sending' from a previous session never completed
  // (the script was torn down before the detector's idle event fired).
  // Reset to 'pending' so the user can resume, and so the item isn't stuck.
  for (const it of items) {
    if (it && it.status === 'sending') it.status = 'pending';
  }
  return {
    items,
    running: false, // always start paused
    delayMs: typeof parsed.delayMs === 'number' ? parsed.delayMs : DEFAULT_STATE.delayMs,
    currentId: undefined,
  };
}

export async function saveState(state: QueueState): Promise<void> {
  try {
    sessionStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(state));
  } catch {
    // sessionStorage can throw on quota errors or when disabled; fail silently
    // rather than breaking the queue.
  }
}

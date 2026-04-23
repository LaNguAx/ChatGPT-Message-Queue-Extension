import { describe, it, expect } from 'vitest';
import { loadState, saveState, onStateChange } from '../src/storage/storage';
import { DEFAULT_STATE, STORAGE_KEY_STATE } from '../src/queue/types';

describe('storage', () => {
  it('returns DEFAULT_STATE when nothing is stored', async () => {
    const s = await loadState();
    expect(s).toEqual(DEFAULT_STATE);
  });

  it('round-trips state via saveState / loadState', async () => {
    await saveState({ ...DEFAULT_STATE, delayMs: 5000, items: [{ id: 'a', text: 'hi', status: 'pending', addedAt: 1 }] });
    const s = await loadState();
    expect(s.delayMs).toBe(5000);
    expect(s.items).toHaveLength(1);
    expect(s.items[0]).toMatchObject({ id: 'a', text: 'hi' });
  });

  it('fires onStateChange when state is written', async () => {
    const seen: any[] = [];
    const off = onStateChange((s) => seen.push(s));
    await saveState({ ...DEFAULT_STATE, delayMs: 123 });
    expect(seen).toHaveLength(1);
    expect(seen[0].delayMs).toBe(123);
    off();
  });

  it('ignores changes to other keys in onStateChange', async () => {
    const seen: any[] = [];
    const off = onStateChange((s) => seen.push(s));
    await chrome.storage.local.set({ 'some-other-key': 'x' });
    expect(seen).toHaveLength(0);
    off();
  });
});

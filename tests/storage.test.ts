import { beforeEach, describe, it, expect } from 'vitest';
import { loadState, saveState } from '../src/storage/storage';
import { DEFAULT_STATE, STORAGE_KEY_STATE } from '../src/queue/types';

describe('storage (per-tab sessionStorage)', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('returns DEFAULT_STATE when nothing is stored', async () => {
    const s = await loadState();
    expect(s).toEqual(DEFAULT_STATE);
  });

  it('round-trips state via saveState / loadState', async () => {
    await saveState({
      ...DEFAULT_STATE,
      delayMs: 5000,
      items: [{ id: 'a', text: 'hi', status: 'pending', addedAt: 1 }],
    });
    const s = await loadState();
    expect(s.delayMs).toBe(5000);
    expect(s.items).toHaveLength(1);
    expect(s.items[0]).toMatchObject({ id: 'a', text: 'hi' });
  });

  it('always starts paused on load even if state was saved running', async () => {
    await saveState({ ...DEFAULT_STATE, running: true });
    const s = await loadState();
    expect(s.running).toBe(false);
  });

  it('resets orphaned sending items to pending on load', async () => {
    sessionStorage.setItem(
      STORAGE_KEY_STATE,
      JSON.stringify({
        ...DEFAULT_STATE,
        items: [
          { id: 'a', text: 'stuck', status: 'sending', addedAt: 1 },
          { id: 'b', text: 'pending', status: 'pending', addedAt: 2 },
          { id: 'c', text: 'done', status: 'done', addedAt: 3 },
        ],
        currentId: 'a',
      }),
    );
    const s = await loadState();
    expect(s.items.map((i) => i.status)).toEqual(['pending', 'pending', 'done']);
    expect(s.currentId).toBeUndefined();
  });

  it('returns DEFAULT_STATE on corrupted JSON', async () => {
    sessionStorage.setItem(STORAGE_KEY_STATE, '{not valid json');
    const s = await loadState();
    expect(s).toEqual(DEFAULT_STATE);
  });

  it('coerces missing or non-numeric delayMs to default', async () => {
    sessionStorage.setItem(STORAGE_KEY_STATE, JSON.stringify({ items: [], running: false }));
    const s = await loadState();
    expect(s.delayMs).toBe(DEFAULT_STATE.delayMs);
  });
});

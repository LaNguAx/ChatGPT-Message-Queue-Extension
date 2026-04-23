import { describe, it, expect, beforeEach, vi } from 'vitest';
import { acquireLock, heartbeat, isOwner, releaseLock, onLockChange } from '../src/storage/lock';
import { STORAGE_KEY_LOCK, LOCK_STALE_MS } from '../src/queue/types';

describe('lock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });

  it('acquires when no lock exists', async () => {
    const ok = await acquireLock('tab-a');
    expect(ok).toBe(true);
    expect(await isOwner('tab-a')).toBe(true);
  });

  it('does not acquire when a fresh lock is held by someone else', async () => {
    await acquireLock('tab-a');
    const ok = await acquireLock('tab-b');
    expect(ok).toBe(false);
    expect(await isOwner('tab-a')).toBe(true);
    expect(await isOwner('tab-b')).toBe(false);
  });

  it('acquires when the existing lock is stale', async () => {
    await acquireLock('tab-a');
    vi.setSystemTime(1_000_000 + LOCK_STALE_MS + 1);
    const ok = await acquireLock('tab-b');
    expect(ok).toBe(true);
    expect(await isOwner('tab-b')).toBe(true);
  });

  it('heartbeat refreshes heartbeatAt', async () => {
    await acquireLock('tab-a');
    vi.setSystemTime(1_000_005);
    await heartbeat('tab-a');
    const obj = await chrome.storage.local.get(STORAGE_KEY_LOCK);
    expect((obj[STORAGE_KEY_LOCK] as any).heartbeatAt).toBe(1_000_005);
  });

  it('releaseLock clears ownership', async () => {
    await acquireLock('tab-a');
    await releaseLock('tab-a');
    expect(await isOwner('tab-a')).toBe(false);
  });

  it('onLockChange fires when ownership changes', async () => {
    const seen: string[] = [];
    const off = onLockChange((lock) => seen.push(lock?.tabId ?? 'none'));
    await acquireLock('tab-a');
    expect(seen).toEqual(['tab-a']);
    off();
  });
});

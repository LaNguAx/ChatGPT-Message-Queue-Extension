import { describe, it, expect, beforeEach, vi } from 'vitest';
import { acquireLock, heartbeat, isOwner, releaseLock, onLockChange } from '../src/storage/lock';
import { STORAGE_KEY_LOCK, LOCK_STALE_MS, TabLock } from '../src/queue/types';

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

  it('releaseLock is a no-op when another tab has taken over', async () => {
    await acquireLock('tab-a');
    // Simulate takeover: tab-b claims the lock directly (e.g. after staleness)
    await chrome.storage.local.set({
      [STORAGE_KEY_LOCK]: { tabId: 'tab-b', heartbeatAt: Date.now() } satisfies TabLock,
    });
    await releaseLock('tab-a');
    expect(await isOwner('tab-b')).toBe(true);
  });

  it('heartbeat from a non-owner is a no-op', async () => {
    await acquireLock('tab-a');
    const before = await chrome.storage.local.get(STORAGE_KEY_LOCK);
    vi.setSystemTime(1_000_100);
    await heartbeat('tab-b');
    const after = await chrome.storage.local.get(STORAGE_KEY_LOCK);
    expect(after[STORAGE_KEY_LOCK]).toEqual(before[STORAGE_KEY_LOCK]);
  });

  it('onLockChange ignores writes to other keys', async () => {
    const seen: unknown[] = [];
    const off = onLockChange((l) => seen.push(l));
    await chrome.storage.local.set({ 'chatgpt-queue:v1:state': { irrelevant: true } });
    expect(seen).toEqual([]);
    off();
  });

  it('stale-boundary: exactly LOCK_STALE_MS is already stale (strict <)', async () => {
    await acquireLock('tab-a');
    // One ms below the boundary: still fresh.
    vi.setSystemTime(1_000_000 + LOCK_STALE_MS - 1);
    expect(await acquireLock('tab-b')).toBe(false);
    expect(await isOwner('tab-a')).toBe(true);
    // Exactly at the boundary: now stale.
    vi.setSystemTime(1_000_000 + LOCK_STALE_MS);
    expect(await acquireLock('tab-c')).toBe(true);
    expect(await isOwner('tab-c')).toBe(true);
  });
});

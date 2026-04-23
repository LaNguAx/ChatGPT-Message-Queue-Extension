import { describe, it, expect } from 'vitest';
import { createQueue } from '../src/queue/queue';
import type { QueueItem } from '../src/queue/types';
import { DEFAULT_STATE } from '../src/queue/types';

const mkItem = (id: string, text = id): QueueItem => ({
  id,
  text,
  status: 'pending',
  addedAt: Date.now(),
});

describe('queue state machine', () => {
  it('adds items to the end of the queue', () => {
    const q = createQueue({ ...DEFAULT_STATE });
    q.add('first');
    q.add('second');
    expect(q.state.items.map((i) => i.text)).toEqual(['first', 'second']);
    expect(q.state.items.every((i) => i.status === 'pending')).toBe(true);
  });

  it('removes an item by id', () => {
    const q = createQueue({ ...DEFAULT_STATE, items: [mkItem('a'), mkItem('b')] });
    q.remove('a');
    expect(q.state.items.map((i) => i.id)).toEqual(['b']);
  });

  it('reorders items via move(from, to)', () => {
    const q = createQueue({ ...DEFAULT_STATE, items: [mkItem('a'), mkItem('b'), mkItem('c')] });
    q.move(0, 2);
    expect(q.state.items.map((i) => i.id)).toEqual(['b', 'c', 'a']);
  });

  it('edit updates text and resets a failed item to pending', () => {
    const q = createQueue({
      ...DEFAULT_STATE,
      items: [{ ...mkItem('a'), status: 'failed', error: 'composer-write-failed' }],
    });
    q.edit('a', 'new text');
    expect(q.state.items[0]).toMatchObject({ text: 'new text', status: 'pending', error: undefined });
  });

  it('start sets running=true; pause sets running=false', () => {
    const q = createQueue({ ...DEFAULT_STATE });
    q.start();
    expect(q.state.running).toBe(true);
    q.pause();
    expect(q.state.running).toBe(false);
  });

  it('nextPending returns the first pending item, or undefined', () => {
    const q = createQueue({
      ...DEFAULT_STATE,
      items: [
        { ...mkItem('a'), status: 'done' },
        { ...mkItem('b'), status: 'pending' },
        { ...mkItem('c'), status: 'pending' },
      ],
    });
    expect(q.nextPending()?.id).toBe('b');
  });

  it('markSending transitions a pending item to sending and records currentId', () => {
    const q = createQueue({ ...DEFAULT_STATE, items: [mkItem('a')] });
    q.markSending('a');
    expect(q.state.items[0]!.status).toBe('sending');
    expect(q.state.currentId).toBe('a');
  });

  it('markDone transitions sending → done and clears currentId', () => {
    const q = createQueue({ ...DEFAULT_STATE, items: [{ ...mkItem('a'), status: 'sending' }], currentId: 'a' });
    q.markDone('a');
    expect(q.state.items[0]!.status).toBe('done');
    expect(q.state.currentId).toBeUndefined();
  });

  it('markFailed transitions sending → failed with error code and clears currentId', () => {
    const q = createQueue({ ...DEFAULT_STATE, items: [{ ...mkItem('a'), status: 'sending' }], currentId: 'a' });
    q.markFailed('a', 'chatgpt-error-toast');
    expect(q.state.items[0]!.status).toBe('failed');
    expect(q.state.items[0]!.error).toBe('chatgpt-error-toast');
    expect(q.state.currentId).toBeUndefined();
  });

  it('retry resets a failed item to pending', () => {
    const q = createQueue({
      ...DEFAULT_STATE,
      items: [{ ...mkItem('a'), status: 'failed', error: 'chatgpt-error-toast' }],
    });
    q.retry('a');
    expect(q.state.items[0]!.status).toBe('pending');
    expect(q.state.items[0]!.error).toBeUndefined();
  });

  it('skip marks a failed item as done (without sending) and leaves others alone', () => {
    const q = createQueue({
      ...DEFAULT_STATE,
      items: [{ ...mkItem('a'), status: 'failed' }, mkItem('b')],
    });
    q.skip('a');
    expect(q.state.items[0]!.status).toBe('done');
    expect(q.state.items[1]!.status).toBe('pending');
  });

  it('subscribe fires with a fresh copy of state on every mutation', () => {
    const q = createQueue({ ...DEFAULT_STATE });
    const seen: number[] = [];
    const off = q.subscribe((s) => seen.push(s.items.length));
    q.add('x');
    q.add('y');
    q.remove(q.state.items[0]!.id);
    expect(seen).toEqual([1, 2, 1]);
    off();
  });

  it('setDelay updates delayMs', () => {
    const q = createQueue({ ...DEFAULT_STATE });
    q.setDelay(5000);
    expect(q.state.delayMs).toBe(5000);
  });

  it('clearCompleted removes done items only', () => {
    const q = createQueue({
      ...DEFAULT_STATE,
      items: [
        { ...mkItem('a'), status: 'done' },
        { ...mkItem('b'), status: 'pending' },
        { ...mkItem('c'), status: 'failed' },
      ],
    });
    q.clearCompleted();
    expect(q.state.items.map((i) => i.id)).toEqual(['b', 'c']);
  });
});

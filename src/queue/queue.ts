import { uuid } from '../util/uuid';
import { ErrorCode, QueueItem, QueueState } from './types';

export type QueueApi = {
  readonly state: QueueState;
  add: (text: string) => void;
  remove: (id: string) => void;
  edit: (id: string, text: string) => void;
  move: (from: number, to: number) => void;
  start: () => void;
  pause: () => void;
  setDelay: (ms: number) => void;
  nextPending: () => QueueItem | undefined;
  markSending: (id: string) => void;
  markDone: (id: string) => void;
  markFailed: (id: string, code: ErrorCode) => void;
  retry: (id: string) => void;
  skip: (id: string) => void;
  clearCompleted: () => void;
  subscribe: (fn: (s: QueueState) => void) => () => void;
  replace: (s: QueueState) => void;
};

export function createQueue(initial: QueueState): QueueApi {
  let state: QueueState = structuredClone(initial);
  const subs = new Set<(s: QueueState) => void>();
  const notify = () => subs.forEach((fn) => fn(structuredClone(state)));

  const mutate = (fn: () => void) => {
    fn();
    notify();
  };

  const find = (id: string) => state.items.find((i) => i.id === id);

  return {
    get state() {
      return state;
    },
    add: (text) =>
      mutate(() => {
        state.items.push({ id: uuid(), text, status: 'pending', addedAt: Date.now() });
      }),
    remove: (id) =>
      mutate(() => {
        state.items = state.items.filter((i) => i.id !== id);
        if (state.currentId === id) state.currentId = undefined;
      }),
    edit: (id, text) =>
      mutate(() => {
        const it = find(id);
        if (!it) return;
        it.text = text;
        if (it.status === 'failed') {
          it.status = 'pending';
          it.error = undefined;
        }
      }),
    move: (from, to) =>
      mutate(() => {
        if (from === to) return;
        if (from < 0 || from >= state.items.length) return;
        if (to < 0 || to >= state.items.length) return;
        const [it] = state.items.splice(from, 1) as [QueueItem];
        state.items.splice(to, 0, it);
      }),
    start: () =>
      mutate(() => {
        state.running = true;
      }),
    pause: () =>
      mutate(() => {
        state.running = false;
      }),
    setDelay: (ms) =>
      mutate(() => {
        state.delayMs = Math.max(0, Math.min(60_000, Math.floor(ms)));
      }),
    nextPending: () => state.items.find((i) => i.status === 'pending'),
    markSending: (id) =>
      mutate(() => {
        const it = find(id);
        if (!it) return;
        it.status = 'sending';
        it.sentAt = Date.now();
        state.currentId = id;
      }),
    markDone: (id) =>
      mutate(() => {
        const it = find(id);
        if (!it) return;
        it.status = 'done';
        if (state.currentId === id) state.currentId = undefined;
      }),
    markFailed: (id, code) =>
      mutate(() => {
        const it = find(id);
        if (!it) return;
        it.status = 'failed';
        it.error = code;
        if (state.currentId === id) state.currentId = undefined;
      }),
    retry: (id) =>
      mutate(() => {
        const it = find(id);
        if (!it || it.status !== 'failed') return;
        it.status = 'pending';
        it.error = undefined;
      }),
    skip: (id) =>
      mutate(() => {
        const it = find(id);
        if (!it || it.status !== 'failed') return;
        it.status = 'done';
        it.error = undefined;
      }),
    clearCompleted: () =>
      mutate(() => {
        state.items = state.items.filter((i) => i.status !== 'done');
      }),
    subscribe: (fn) => {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
    replace: (s) =>
      mutate(() => {
        state = structuredClone(s);
      }),
  };
}

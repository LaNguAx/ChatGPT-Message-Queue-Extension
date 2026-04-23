# ChatGPT Queue Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome MV3 extension for chatgpt.com that lets users queue prompts and auto-sends the next one when ChatGPT finishes responding.

**Architecture:** Content-script-heavy MV3 extension. A floating Shadow-DOM panel injected into chatgpt.com manages the queue. A MutationObserver detects idle/generating/error state; a sender module types into ChatGPT's ProseMirror composer and clicks Send. Queue state persists in `chrome.storage.local`. A tab-ownership lock prevents double-sending across multiple ChatGPT tabs.

**Tech Stack:** TypeScript, Vite, `@crxjs/vite-plugin`, React 19, Vitest (with jsdom), `@types/chrome`.

**Reference spec:** `docs/superpowers/specs/2026-04-23-chatgpt-queue-extension-design.md`

---

## File Structure

```
manifest.config.ts                 # CRXJS manifest via defineManifest()
vite.config.ts                     # Vite + CRXJS + React
vitest.config.ts                   # Vitest with jsdom
tsconfig.json
package.json
.gitignore
README.md
src/
  content/
    content.ts                     # entry — runs at document_idle on chatgpt.com
    selectors.ts                   # prioritized DOM selector lists
    detector.ts                    # MutationObserver → QueueEvent emissions
    sender.ts                      # write to composer + click send
  queue/
    queue.ts                       # state machine (pure, no DOM)
    types.ts                       # QueueItem, QueueState, ErrorCode, etc.
  storage/
    storage.ts                     # chrome.storage.local wrappers
    lock.ts                        # tab-ownership lock
  panel/
    mount.tsx                      # Shadow DOM + React root mount
    Panel.tsx                      # top-level panel component
    PanelList.tsx                  # queue list with drag/edit/remove
    PanelSettings.tsx              # settings drawer
    panel.css                      # all panel styles (injected into shadow root)
    theme.ts                       # light/dark detection
    position.ts                    # drag + persisted x/y
  util/
    uuid.ts                        # tiny UUID v4 helper
    logger.ts                      # namespaced console logger
tests/
  setup.ts                         # vitest setup: chrome mock, DOM fixtures
  fixtures/
    chatgpt-idle.html              # recorded DOM snapshot
    chatgpt-generating.html
    chatgpt-error-toast.html
  queue.test.ts
  storage.test.ts
  lock.test.ts
  selectors.test.ts
  detector.test.ts
  sender.test.ts
  uuid.test.ts
```

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `manifest.config.ts`, `.gitignore`, `README.md`, `src/content/content.ts`, `tests/setup.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "chatgpt-queue",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0",
    "@types/chrome": "^0.0.280",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.6.0",
    "vite": "^7.0.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "types": ["chrome", "vitest/globals"],
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src", "tests", "manifest.config.ts", "vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 3: Create `manifest.config.ts`**

```typescript
import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'ChatGPT Queue',
  description: 'Queue prompts for ChatGPT; auto-send the next one when the current response finishes.',
  version: pkg.version,
  host_permissions: ['https://chatgpt.com/*'],
  permissions: ['storage'],
  content_scripts: [
    {
      matches: ['https://chatgpt.com/*'],
      js: ['src/content/content.ts'],
      run_at: 'document_idle',
    },
  ],
  action: { default_title: 'ChatGPT Queue' },
});
```

- [ ] **Step 4: Create `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  server: { cors: { origin: [/chrome-extension:\/\//] } },
});
```

- [ ] **Step 5: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 6: Create `tests/setup.ts`** with a minimal chrome.storage mock

```typescript
const store = new Map<string, unknown>();
const listeners: Array<(changes: Record<string, chrome.storage.StorageChange>, area: string) => void> = [];

const local = {
  get: async (keys?: string | string[] | null): Promise<Record<string, unknown>> => {
    if (keys == null) return Object.fromEntries(store);
    const arr = Array.isArray(keys) ? keys : [keys];
    return Object.fromEntries(arr.filter((k) => store.has(k)).map((k) => [k, store.get(k)]));
  },
  set: async (items: Record<string, unknown>): Promise<void> => {
    const changes: Record<string, chrome.storage.StorageChange> = {};
    for (const [k, newValue] of Object.entries(items)) {
      changes[k] = { oldValue: store.get(k), newValue };
      store.set(k, newValue);
    }
    listeners.forEach((fn) => fn(changes, 'local'));
  },
  remove: async (keys: string | string[]): Promise<void> => {
    const arr = Array.isArray(keys) ? keys : [keys];
    const changes: Record<string, chrome.storage.StorageChange> = {};
    for (const k of arr) {
      if (store.has(k)) {
        changes[k] = { oldValue: store.get(k), newValue: undefined };
        store.delete(k);
      }
    }
    listeners.forEach((fn) => fn(changes, 'local'));
  },
  clear: async (): Promise<void> => {
    store.clear();
  },
};

// @ts-expect-error injecting minimal shape
globalThis.chrome = {
  storage: {
    local,
    onChanged: {
      addListener: (fn: typeof listeners[number]) => listeners.push(fn),
      removeListener: (fn: typeof listeners[number]) => {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
      },
    },
  },
};

// Reset between tests
beforeEach(() => {
  store.clear();
  listeners.length = 0;
});
```

- [ ] **Step 7: Create `src/content/content.ts`** (placeholder entry)

```typescript
console.log('[chatgpt-queue] content script loaded on', location.href);
```

- [ ] **Step 8: Create `.gitignore`**

```
node_modules/
dist/
.DS_Store
*.log
.vite/
coverage/
```

- [ ] **Step 9: Create `README.md`** (minimal)

```markdown
# ChatGPT Queue

Chrome extension that queues prompts for chatgpt.com and auto-sends the next one when the current response finishes.

## Development

    npm install
    npm run dev    # builds + watches; load the `dist/` folder as an unpacked extension
    npm test
    npm run build

## Load in Chrome

1. Visit `chrome://extensions`
2. Enable Developer Mode
3. Click "Load unpacked" and choose the `dist/` folder
4. Open https://chatgpt.com — the queue panel should appear bottom-right

See `docs/superpowers/specs/` for design, `docs/superpowers/plans/` for the implementation plan.
```

- [ ] **Step 10: Initialize git, install, typecheck, build**

```bash
git init
npm install
npm run typecheck
npm run build
```

Expected: `dist/manifest.json` + `dist/` assets produced. Typecheck exits 0.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + CRXJS + Vitest project"
```

---

## Task 2: Shared types

**Files:**
- Create: `src/queue/types.ts`

- [ ] **Step 1: Create `src/queue/types.ts`**

```typescript
export type QueueItemStatus = 'pending' | 'sending' | 'done' | 'failed';

export type QueueItem = {
  id: string;
  text: string;
  status: QueueItemStatus;
  addedAt: number;
  sentAt?: number;
  error?: ErrorCode;
};

export type QueueState = {
  items: QueueItem[];
  running: boolean;
  delayMs: number;
  currentId?: string;
};

export type TabLock = {
  tabId: string;
  heartbeatAt: number;
};

export type ErrorCode =
  | 'composer-not-found'
  | 'composer-write-failed'
  | 'send-button-not-found'
  | 'send-click-ignored'
  | 'chatgpt-error-toast'
  | 'auth-wall'
  | 'selectors-stale';

export type DetectorEvent =
  | { type: 'idle' }
  | { type: 'generating' }
  | { type: 'error'; code: ErrorCode; message?: string };

export const STORAGE_KEY_STATE = 'chatgpt-queue:v1:state';
export const STORAGE_KEY_LOCK = 'chatgpt-queue:v1:lock';
export const STORAGE_KEY_POSITION = 'chatgpt-queue:v1:position';

export const DEFAULT_STATE: QueueState = {
  items: [],
  running: false,
  delayMs: 2000,
};

export const IDLE_STABILITY_MS = 800;
export const LOCK_STALE_MS = 10_000;
export const LOCK_HEARTBEAT_MS = 3_000;
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/queue/types.ts
git commit -m "feat(types): shared queue, lock, and error types"
```

---

## Task 3: UUID helper (with test)

**Files:**
- Create: `src/util/uuid.ts`, `tests/uuid.test.ts`

- [ ] **Step 1: Write the failing test — `tests/uuid.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { uuid } from '../src/util/uuid';

describe('uuid', () => {
  it('produces canonical v4 strings', () => {
    const id = uuid();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('produces distinct values across many calls', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) seen.add(uuid());
    expect(seen.size).toBe(1000);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npx vitest run tests/uuid.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/util/uuid.ts`**

```typescript
export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback (should not hit in Chrome content scripts, but jsdom older versions)
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx vitest run tests/uuid.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/util/uuid.ts tests/uuid.test.ts
git commit -m "feat(util): uuid v4 helper with tests"
```

---

## Task 4: Logger helper

**Files:**
- Create: `src/util/logger.ts`

- [ ] **Step 1: Implement `src/util/logger.ts`** (no test — trivial)

```typescript
type Level = 'debug' | 'info' | 'warn' | 'error';

let verbose = false;
export const setVerbose = (v: boolean) => {
  verbose = v;
};

const PREFIX = '[chatgpt-queue]';

export const log = {
  debug: (...a: unknown[]) => {
    if (verbose) console.debug(PREFIX, ...a);
  },
  info: (...a: unknown[]) => console.info(PREFIX, ...a),
  warn: (...a: unknown[]) => console.warn(PREFIX, ...a),
  error: (...a: unknown[]) => console.error(PREFIX, ...a),
} satisfies Record<Level, (...a: unknown[]) => void>;
```

- [ ] **Step 2: Commit**

```bash
git add src/util/logger.ts
git commit -m "feat(util): namespaced logger"
```

---

## Task 5: Storage wrappers (with tests)

**Files:**
- Create: `src/storage/storage.ts`, `tests/storage.test.ts`

- [ ] **Step 1: Write failing test — `tests/storage.test.ts`**

```typescript
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
```

- [ ] **Step 2: Run — expect failure**

Run: `npx vitest run tests/storage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/storage/storage.ts`**

```typescript
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
```

- [ ] **Step 4: Run — expect pass**

Run: `npx vitest run tests/storage.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/storage/storage.ts tests/storage.test.ts
git commit -m "feat(storage): state load/save/onChange with tests"
```

---

## Task 6: Tab-ownership lock (with tests)

**Files:**
- Create: `src/storage/lock.ts`, `tests/lock.test.ts`

- [ ] **Step 1: Write failing test — `tests/lock.test.ts`**

```typescript
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
```

- [ ] **Step 2: Run — expect failure**

Run: `npx vitest run tests/lock.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/storage/lock.ts`**

```typescript
import { LOCK_STALE_MS, STORAGE_KEY_LOCK, TabLock } from '../queue/types';

async function readLock(): Promise<TabLock | undefined> {
  const obj = await chrome.storage.local.get(STORAGE_KEY_LOCK);
  return obj[STORAGE_KEY_LOCK] as TabLock | undefined;
}

export async function acquireLock(tabId: string): Promise<boolean> {
  const now = Date.now();
  const existing = await readLock();
  const fresh = existing && now - existing.heartbeatAt < LOCK_STALE_MS;
  if (fresh && existing.tabId !== tabId) return false;
  const lock: TabLock = { tabId, heartbeatAt: now };
  await chrome.storage.local.set({ [STORAGE_KEY_LOCK]: lock });
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
  return Date.now() - existing.heartbeatAt < LOCK_STALE_MS;
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
```

- [ ] **Step 4: Run — expect pass**

Run: `npx vitest run tests/lock.test.ts`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/storage/lock.ts tests/lock.test.ts
git commit -m "feat(lock): tab-ownership lock with heartbeat and stale takeover"
```

---

## Task 7: Queue state machine (with tests)

**Files:**
- Create: `src/queue/queue.ts`, `tests/queue.test.ts`

- [ ] **Step 1: Write failing test — `tests/queue.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { createQueue } from '../src/queue/queue';
import { QueueItem, DEFAULT_STATE } from '../src/queue/types';

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
    expect(q.state.items[0].status).toBe('sending');
    expect(q.state.currentId).toBe('a');
  });

  it('markDone transitions sending → done and clears currentId', () => {
    const q = createQueue({ ...DEFAULT_STATE, items: [{ ...mkItem('a'), status: 'sending' }], currentId: 'a' });
    q.markDone('a');
    expect(q.state.items[0].status).toBe('done');
    expect(q.state.currentId).toBeUndefined();
  });

  it('markFailed transitions sending → failed with error code and clears currentId', () => {
    const q = createQueue({ ...DEFAULT_STATE, items: [{ ...mkItem('a'), status: 'sending' }], currentId: 'a' });
    q.markFailed('a', 'chatgpt-error-toast');
    expect(q.state.items[0].status).toBe('failed');
    expect(q.state.items[0].error).toBe('chatgpt-error-toast');
    expect(q.state.currentId).toBeUndefined();
  });

  it('retry resets a failed item to pending', () => {
    const q = createQueue({
      ...DEFAULT_STATE,
      items: [{ ...mkItem('a'), status: 'failed', error: 'chatgpt-error-toast' }],
    });
    q.retry('a');
    expect(q.state.items[0].status).toBe('pending');
    expect(q.state.items[0].error).toBeUndefined();
  });

  it('skip marks a failed item as done (without sending) and leaves others alone', () => {
    const q = createQueue({
      ...DEFAULT_STATE,
      items: [{ ...mkItem('a'), status: 'failed' }, mkItem('b')],
    });
    q.skip('a');
    expect(q.state.items[0].status).toBe('done');
    expect(q.state.items[1].status).toBe('pending');
  });

  it('subscribe fires with a fresh copy of state on every mutation', () => {
    const q = createQueue({ ...DEFAULT_STATE });
    const seen: number[] = [];
    const off = q.subscribe((s) => seen.push(s.items.length));
    q.add('x');
    q.add('y');
    q.remove(q.state.items[0].id);
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
```

- [ ] **Step 2: Run — expect failure**

Run: `npx vitest run tests/queue.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/queue/queue.ts`**

```typescript
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
        const [it] = state.items.splice(from, 1);
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
```

- [ ] **Step 4: Run — expect pass**

Run: `npx vitest run tests/queue.test.ts`
Expected: all queue tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/queue/queue.ts tests/queue.test.ts
git commit -m "feat(queue): state machine with tests"
```

---

## Task 8: Selectors (with tests)

**Files:**
- Create: `src/content/selectors.ts`, `tests/selectors.test.ts`

- [ ] **Step 1: Write failing test — `tests/selectors.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { findComposer, findSubmitButton, findStopButton, isGenerating } from '../src/content/selectors';

function setBody(html: string) {
  document.body.innerHTML = html;
}

describe('selectors', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('findComposer', () => {
    it('finds composer by id#prompt-textarea', () => {
      setBody('<div id="prompt-textarea" contenteditable="true"></div>');
      expect(findComposer()).not.toBeNull();
    });

    it('falls back to any contenteditable inside a form', () => {
      setBody('<form><div contenteditable="true" class="x"></div></form>');
      const el = findComposer();
      expect(el).not.toBeNull();
      expect(el?.getAttribute('contenteditable')).toBe('true');
    });

    it('returns null when no composer is present', () => {
      setBody('<div>nope</div>');
      expect(findComposer()).toBeNull();
    });
  });

  describe('findSubmitButton / findStopButton', () => {
    it('finds send button via data-testid', () => {
      setBody('<button data-testid="send-button"></button>');
      expect(findSubmitButton()).not.toBeNull();
    });

    it('finds send button via aria-label', () => {
      setBody('<button aria-label="Send prompt"></button>');
      expect(findSubmitButton()).not.toBeNull();
    });

    it('finds stop button via data-testid', () => {
      setBody('<button data-testid="stop-button"></button>');
      expect(findStopButton()).not.toBeNull();
    });

    it('finds stop button via aria-label', () => {
      setBody('<button aria-label="Stop streaming"></button>');
      expect(findStopButton()).not.toBeNull();
    });
  });

  describe('isGenerating', () => {
    it('true when stop button present', () => {
      setBody('<button data-testid="stop-button"></button>');
      expect(isGenerating()).toBe(true);
    });

    it('false when only send button present', () => {
      setBody('<button data-testid="send-button"></button>');
      expect(isGenerating()).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npx vitest run tests/selectors.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/content/selectors.ts`**

```typescript
const COMPOSER_SELECTORS = [
  '#prompt-textarea[contenteditable="true"]',
  'div[contenteditable="true"]#prompt-textarea',
  'form div[contenteditable="true"]',
  'div[contenteditable="true"]',
];

const SUBMIT_SELECTORS = [
  'button[data-testid="send-button"]',
  'button[aria-label="Send prompt"]',
  '#composer-submit-button',
];

const STOP_SELECTORS = [
  'button[data-testid="stop-button"]',
  'button[aria-label="Stop streaming"]',
];

const ERROR_TOAST_SELECTORS = [
  '[role="alert"]',
  '[data-testid="error-toast"]',
];

const AUTH_PATHS = ['/auth', '/login', '/auth/login'];

function firstMatch(selectors: string[]): HTMLElement | null {
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) return el;
  }
  return null;
}

export function findComposer(): HTMLElement | null {
  return firstMatch(COMPOSER_SELECTORS);
}

export function findSubmitButton(): HTMLButtonElement | null {
  return firstMatch(SUBMIT_SELECTORS) as HTMLButtonElement | null;
}

export function findStopButton(): HTMLButtonElement | null {
  return firstMatch(STOP_SELECTORS) as HTMLButtonElement | null;
}

export function isGenerating(): boolean {
  return findStopButton() != null;
}

const ERROR_RX = /\b(error|rate[- ]?limit|usage cap|try again|network|something went wrong)\b/i;

export function findErrorToast(): { element: HTMLElement; text: string } | null {
  for (const sel of ERROR_TOAST_SELECTORS) {
    const els = document.querySelectorAll<HTMLElement>(sel);
    for (const el of els) {
      const text = (el.textContent || '').trim();
      if (text && ERROR_RX.test(text)) return { element: el, text };
    }
  }
  return null;
}

export function isAuthWall(): boolean {
  return AUTH_PATHS.some((p) => location.pathname.startsWith(p));
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx vitest run tests/selectors.test.ts`
Expected: all selector tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/content/selectors.ts tests/selectors.test.ts
git commit -m "feat(selectors): prioritized composer/button/error selectors"
```

---

## Task 9: Detector (with tests)

**Files:**
- Create: `src/content/detector.ts`, `tests/detector.test.ts`

- [ ] **Step 1: Write failing test — `tests/detector.test.ts`**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDetector } from '../src/content/detector';
import { DetectorEvent } from '../src/queue/types';

function set(html: string) {
  document.body.innerHTML = html;
}

const IDLE_HTML = '<button data-testid="send-button"></button>';
const GEN_HTML = '<button data-testid="stop-button"></button>';
const ERR_HTML = '<button data-testid="send-button"></button><div role="alert">Network error. Please try again.</div>';

describe('detector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  it('emits initial idle when page is idle', async () => {
    set(IDLE_HTML);
    const events: DetectorEvent[] = [];
    const d = createDetector((e) => events.push(e), { idleStabilityMs: 50 });
    d.start();
    await vi.advanceTimersByTimeAsync(100);
    expect(events.some((e) => e.type === 'idle')).toBe(true);
    d.stop();
  });

  it('emits generating when stop-button appears', async () => {
    set(IDLE_HTML);
    const events: DetectorEvent[] = [];
    const d = createDetector((e) => events.push(e), { idleStabilityMs: 50 });
    d.start();
    await vi.advanceTimersByTimeAsync(100);
    events.length = 0;
    set(GEN_HTML);
    await vi.advanceTimersByTimeAsync(100);
    expect(events.some((e) => e.type === 'generating')).toBe(true);
    d.stop();
  });

  it('emits idle only after idleStabilityMs of stop-button absence', async () => {
    set(GEN_HTML);
    const events: DetectorEvent[] = [];
    const d = createDetector((e) => events.push(e), { idleStabilityMs: 500 });
    d.start();
    await vi.advanceTimersByTimeAsync(10);
    events.length = 0;
    set(IDLE_HTML);
    // briefly flicker back to generating
    await vi.advanceTimersByTimeAsync(200);
    set(GEN_HTML);
    await vi.advanceTimersByTimeAsync(200);
    set(IDLE_HTML);
    // should NOT have emitted idle yet
    expect(events.filter((e) => e.type === 'idle')).toHaveLength(0);
    // hold idle past stability window
    await vi.advanceTimersByTimeAsync(600);
    expect(events.some((e) => e.type === 'idle')).toBe(true);
    d.stop();
  });

  it('emits error when an error toast appears', async () => {
    set(IDLE_HTML);
    const events: DetectorEvent[] = [];
    const d = createDetector((e) => events.push(e), { idleStabilityMs: 50 });
    d.start();
    await vi.advanceTimersByTimeAsync(100);
    events.length = 0;
    set(ERR_HTML);
    await vi.advanceTimersByTimeAsync(100);
    expect(events.some((e) => e.type === 'error' && e.code === 'chatgpt-error-toast')).toBe(true);
    d.stop();
  });

  it('reports selectors-stale if no signals present for too long', async () => {
    set('<div>nothing useful</div>');
    const events: DetectorEvent[] = [];
    const d = createDetector((e) => events.push(e), { idleStabilityMs: 50, selectorStaleMs: 500 });
    d.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(events.some((e) => e.type === 'error' && e.code === 'selectors-stale')).toBe(true);
    d.stop();
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npx vitest run tests/detector.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/content/detector.ts`**

```typescript
import { DetectorEvent, IDLE_STABILITY_MS } from '../queue/types';
import { findComposer, findErrorToast, findStopButton, findSubmitButton, isAuthWall } from './selectors';

type Options = {
  idleStabilityMs?: number;
  selectorStaleMs?: number;
};

type State = 'unknown' | 'idle' | 'generating' | 'error';

export type Detector = {
  start: () => void;
  stop: () => void;
};

export function createDetector(emit: (ev: DetectorEvent) => void, opts: Options = {}): Detector {
  const idleStabilityMs = opts.idleStabilityMs ?? IDLE_STABILITY_MS;
  const selectorStaleMs = opts.selectorStaleMs ?? 15_000;

  let current: State = 'unknown';
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let staleTimer: ReturnType<typeof setTimeout> | undefined;
  let observer: MutationObserver | undefined;

  const clearIdle = () => {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = undefined;
    }
  };

  const resetStaleTimer = () => {
    if (staleTimer) clearTimeout(staleTimer);
    staleTimer = setTimeout(() => {
      if (!findComposer() && !findSubmitButton() && !findStopButton()) {
        emit({ type: 'error', code: 'selectors-stale' });
      }
    }, selectorStaleMs);
  };

  const scan = () => {
    if (isAuthWall()) {
      if (current !== 'error') {
        current = 'error';
        emit({ type: 'error', code: 'auth-wall' });
      }
      return;
    }

    const toast = findErrorToast();
    if (toast) {
      if (current !== 'error') {
        current = 'error';
        emit({ type: 'error', code: 'chatgpt-error-toast', message: toast.text });
      }
      return;
    }

    const generating = findStopButton() != null;
    if (generating) {
      clearIdle();
      if (current !== 'generating') {
        current = 'generating';
        emit({ type: 'generating' });
      }
      return;
    }

    // Not generating — start / keep the idle-stability timer
    if (current !== 'idle' && !idleTimer) {
      idleTimer = setTimeout(() => {
        current = 'idle';
        emit({ type: 'idle' });
        idleTimer = undefined;
      }, idleStabilityMs);
    }
  };

  return {
    start: () => {
      observer = new MutationObserver(() => {
        resetStaleTimer();
        scan();
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
      resetStaleTimer();
      scan();
    },
    stop: () => {
      observer?.disconnect();
      observer = undefined;
      clearIdle();
      if (staleTimer) clearTimeout(staleTimer);
      staleTimer = undefined;
      current = 'unknown';
    },
  };
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx vitest run tests/detector.test.ts`
Expected: all detector tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/content/detector.ts tests/detector.test.ts
git commit -m "feat(detector): MutationObserver state machine for idle/generating/error"
```

---

## Task 10: Sender (with tests)

**Files:**
- Create: `src/content/sender.ts`, `tests/sender.test.ts`

- [ ] **Step 1: Write failing test — `tests/sender.test.ts`**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendMessage } from '../src/content/sender';

function mkComposer(textGetter: () => string) {
  document.body.innerHTML = `
    <form>
      <div id="prompt-textarea" contenteditable="true"></div>
      <button data-testid="send-button"></button>
    </form>
  `;
  const composer = document.querySelector<HTMLElement>('#prompt-textarea')!;
  const sendBtn = document.querySelector<HTMLButtonElement>('[data-testid="send-button"]')!;
  // mock execCommand to write into composer
  (document as any).execCommand = vi.fn((cmd: string, _ui: boolean, arg?: string) => {
    if (cmd === 'selectAll' || cmd === 'delete') {
      composer.textContent = '';
      return true;
    }
    if (cmd === 'insertText' && typeof arg === 'string') {
      composer.textContent = (composer.textContent || '') + arg;
      return true;
    }
    if (cmd === 'insertLineBreak') {
      composer.textContent = (composer.textContent || '') + '\n';
      return true;
    }
    return false;
  });
  const clicks: string[] = [];
  sendBtn.addEventListener('click', () => {
    clicks.push('send');
    // Simulate ChatGPT entering generating state
    sendBtn.setAttribute('data-testid', 'stop-button');
  });
  return { composer, sendBtn, clicks, readText: () => composer.textContent || '' };
}

describe('sendMessage', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('writes text into the composer and clicks send', async () => {
    const h = mkComposer(() => '');
    const result = await sendMessage('hello world', { postSendTimeoutMs: 500 });
    expect(result).toEqual({ ok: true });
    expect(h.readText()).toBe('hello world');
    expect(h.clicks).toEqual(['send']);
  });

  it('fails with composer-not-found when no composer exists', async () => {
    document.body.innerHTML = '<div>nope</div>';
    const result = await sendMessage('x', { postSendTimeoutMs: 100 });
    expect(result).toEqual({ ok: false, code: 'composer-not-found' });
  });

  it('fails with send-click-ignored when no state change follows click', async () => {
    document.body.innerHTML = `
      <form>
        <div id="prompt-textarea" contenteditable="true"></div>
        <button data-testid="send-button"></button>
      </form>
    `;
    (document as any).execCommand = vi.fn((cmd: string, _u: boolean, arg?: string) => {
      if (cmd === 'insertText' && typeof arg === 'string') {
        document.querySelector('#prompt-textarea')!.textContent = arg;
        return true;
      }
      return true;
    });
    // send button does nothing when clicked — stays a send-button
    const result = await sendMessage('x', { postSendTimeoutMs: 200 });
    expect(result).toEqual({ ok: false, code: 'send-click-ignored' });
  });

  it('handles multi-line text with line breaks', async () => {
    const h = mkComposer(() => '');
    await sendMessage('line1\nline2', { postSendTimeoutMs: 500 });
    expect(h.readText()).toBe('line1\nline2');
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npx vitest run tests/sender.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/content/sender.ts`**

```typescript
import { ErrorCode } from '../queue/types';
import { findComposer, findStopButton, findSubmitButton } from './selectors';
import { log } from '../util/logger';

export type SendResult = { ok: true } | { ok: false; code: ErrorCode };

type Options = {
  postSendTimeoutMs?: number;
};

const waitFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function writeTextViaExecCommand(el: HTMLElement, text: string): Promise<boolean> {
  el.focus();
  document.execCommand('selectAll', false);
  document.execCommand('delete', false);
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) document.execCommand('insertLineBreak', false);
    if (lines[i]) document.execCommand('insertText', false, lines[i]);
  }
  await waitFrame();
  return (el.textContent || '').replace(/\r/g, '') === text;
}

async function writeTextViaEvents(el: HTMLElement, text: string): Promise<boolean> {
  el.focus();
  el.textContent = '';
  el.dispatchEvent(new InputEvent('input', { inputType: 'deleteContentBackward', bubbles: true }));
  el.textContent = text;
  el.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: text, bubbles: true }));
  el.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: text, bubbles: true }));
  await waitFrame();
  return (el.textContent || '') === text;
}

export async function sendMessage(text: string, opts: Options = {}): Promise<SendResult> {
  const timeoutMs = opts.postSendTimeoutMs ?? 2000;
  const composer = findComposer();
  if (!composer) return { ok: false, code: 'composer-not-found' };

  let ok = await writeTextViaExecCommand(composer, text);
  if (!ok) {
    log.warn('execCommand write failed, trying event-based fallback');
    ok = await writeTextViaEvents(composer, text);
  }
  if (!ok) return { ok: false, code: 'composer-write-failed' };

  const btn = findSubmitButton();
  if (!btn) return { ok: false, code: 'send-button-not-found' };

  btn.click();

  // Verify state transition to generating within timeout
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (findStopButton() != null) return { ok: true };
    await wait(50);
  }
  return { ok: false, code: 'send-click-ignored' };
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx vitest run tests/sender.test.ts`
Expected: all sender tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/content/sender.ts tests/sender.test.ts
git commit -m "feat(sender): composer write + click with execCommand and event fallback"
```

---

## Task 11: Panel mount (Shadow DOM + React root)

**Files:**
- Create: `src/panel/mount.tsx`, `src/panel/panel.css`, `src/panel/theme.ts`, minimal `src/panel/Panel.tsx`

- [ ] **Step 1: Create `src/panel/theme.ts`**

```typescript
export function detectTheme(): 'light' | 'dark' {
  const root = document.documentElement;
  if (root.classList.contains('dark')) return 'dark';
  if (root.classList.contains('light')) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function onThemeChange(fn: (t: 'light' | 'dark') => void): () => void {
  const obs = new MutationObserver(() => fn(detectTheme()));
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const mqlListener = () => fn(detectTheme());
  mql.addEventListener('change', mqlListener);
  return () => {
    obs.disconnect();
    mql.removeEventListener('change', mqlListener);
  };
}
```

- [ ] **Step 2: Create `src/panel/panel.css`** (starter styles, imported as raw text)

```css
:host {
  all: initial;
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 2147483647;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 14px;
  color: #111;
}
:host([data-theme='dark']) {
  color: #eee;
}
.panel {
  width: 360px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}
:host([data-theme='dark']) .panel {
  background: #1f2023;
  border-color: #333;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}
.collapsed {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 999px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
:host([data-theme='dark']) .collapsed {
  background: #1f2023;
  border-color: #333;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #9ca3af;
}
.dot.running { background: #3b82f6; }
.dot.paused  { background: #f59e0b; }
.dot.error   { background: #ef4444; }
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #eee;
}
:host([data-theme='dark']) .header {
  border-color: #333;
}
.header h1 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.body { padding: 10px 12px; display: flex; flex-direction: column; gap: 10px; }
textarea {
  width: 100%;
  min-height: 60px;
  box-sizing: border-box;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font: inherit;
  resize: vertical;
  background: inherit;
  color: inherit;
}
button {
  font: inherit;
  border: 1px solid #d4d4d4;
  background: #f5f5f5;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
}
:host([data-theme='dark']) button {
  background: #2a2b2f;
  border-color: #444;
  color: #eee;
}
button.primary {
  background: #10a37f;
  color: white;
  border-color: #10a37f;
}
button.primary:hover { background: #0e8f6e; }
ul.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; max-height: 300px; overflow-y: auto; }
li.item { display: flex; gap: 6px; align-items: flex-start; padding: 6px; border: 1px solid #eee; border-radius: 6px; }
:host([data-theme='dark']) li.item { border-color: #333; }
li.item.failed { border-color: #ef4444; background: rgba(239, 68, 68, 0.08); }
li.item.sending { border-color: #3b82f6; }
li.item.done { opacity: 0.5; }
.item-text { flex: 1; white-space: pre-wrap; word-break: break-word; }
.item-actions { display: flex; gap: 4px; }
.footer { padding: 8px 12px; border-top: 1px solid #eee; display: flex; justify-content: space-between; font-size: 12px; color: #666; }
:host([data-theme='dark']) .footer { border-color: #333; color: #aaa; }
```

- [ ] **Step 3: Create minimal `src/panel/Panel.tsx`** (full implementation in Task 12; placeholder here)

```tsx
import { useEffect, useState } from 'react';
import { QueueApi } from '../queue/queue';
import { QueueState } from '../queue/types';

type Props = { queue: QueueApi };

export function Panel({ queue }: Props) {
  const [state, setState] = useState<QueueState>(queue.state);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => queue.subscribe(setState), [queue]);

  const dotClass =
    state.items.some((i) => i.status === 'failed') ? 'error'
    : state.running ? 'running'
    : state.items.some((i) => i.status === 'pending') ? 'paused'
    : '';

  if (collapsed) {
    return (
      <button className="collapsed" onClick={() => setCollapsed(false)} aria-label="Open ChatGPT Queue">
        <span className={`dot ${dotClass}`} />
        <span>
          {state.running ? '▶' : '⏸'} {state.items.filter((i) => i.status === 'pending').length} queued
        </span>
      </button>
    );
  }

  return (
    <div className="panel">
      <div className="header">
        <h1>ChatGPT Queue</h1>
        <button onClick={() => setCollapsed(true)} aria-label="Collapse">—</button>
      </div>
      <div className="body">
        <div style={{ color: '#888' }}>Panel body — built out in Task 12</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/panel/mount.tsx`**

```tsx
import { createRoot, Root } from 'react-dom/client';
import { Panel } from './Panel';
import { QueueApi } from '../queue/queue';
import { detectTheme, onThemeChange } from './theme';
import panelCss from './panel.css?raw';

export type PanelHandle = { unmount: () => void };

export function mountPanel(queue: QueueApi): PanelHandle {
  const host = document.createElement('div');
  host.id = 'chatgpt-queue-host';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = panelCss;
  shadow.appendChild(style);
  const container = document.createElement('div');
  shadow.appendChild(container);

  const setTheme = (t: 'light' | 'dark') => host.setAttribute('data-theme', t);
  setTheme(detectTheme());
  const offTheme = onThemeChange(setTheme);

  const root: Root = createRoot(container);
  root.render(<Panel queue={queue} />);

  return {
    unmount: () => {
      offTheme();
      root.unmount();
      host.remove();
    },
  };
}
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/panel/mount.tsx src/panel/Panel.tsx src/panel/panel.css src/panel/theme.ts
git commit -m "feat(panel): Shadow DOM mount with minimal React panel"
```

---

## Task 12: Full Panel UI (list, add, start/pause, error controls, settings)

**Files:**
- Modify: `src/panel/Panel.tsx`
- Create: `src/panel/PanelList.tsx`, `src/panel/PanelSettings.tsx`

- [ ] **Step 1: Replace `src/panel/Panel.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import { QueueApi } from '../queue/queue';
import { QueueState } from '../queue/types';
import { PanelList } from './PanelList';
import { PanelSettings } from './PanelSettings';

type Props = { queue: QueueApi; readOnlyReason?: string | null; onTakeOver?: () => void };

export function Panel({ queue, readOnlyReason, onTakeOver }: Props) {
  const [state, setState] = useState<QueueState>(queue.state);
  const [collapsed, setCollapsed] = useState(true);
  const [draft, setDraft] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => queue.subscribe(setState), [queue]);

  const pending = state.items.filter((i) => i.status === 'pending').length;
  const done = state.items.filter((i) => i.status === 'done').length;
  const failed = state.items.filter((i) => i.status === 'failed').length;

  const dotClass =
    failed > 0 ? 'error'
    : state.running ? 'running'
    : pending > 0 ? 'paused'
    : '';

  const onAdd = () => {
    const text = draft.trim();
    if (!text) return;
    queue.add(text);
    setDraft('');
    textareaRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onAdd();
    }
  };

  if (collapsed) {
    return (
      <button className="collapsed" onClick={() => setCollapsed(false)} aria-label="Open ChatGPT Queue">
        <span className={`dot ${dotClass}`} />
        <span>
          {state.running ? '▶' : '⏸'} {pending} queued
        </span>
      </button>
    );
  }

  return (
    <div className="panel" role="region" aria-label="ChatGPT Queue">
      <div className="header">
        <h1>
          <span className={`dot ${dotClass}`} style={{ display: 'inline-block', marginRight: 6 }} />
          ChatGPT Queue
        </h1>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setShowSettings((s) => !s)} aria-label="Settings">⚙</button>
          <button onClick={() => setCollapsed(true)} aria-label="Collapse">—</button>
        </div>
      </div>

      {readOnlyReason && (
        <div style={{ padding: '8px 12px', background: '#fffae6', color: '#7a5a00', fontSize: 12 }}>
          {readOnlyReason}{' '}
          <button onClick={onTakeOver} style={{ marginLeft: 6 }}>Take over</button>
        </div>
      )}

      <div className="body">
        <textarea
          ref={textareaRef}
          placeholder="Type a prompt…  (Ctrl+Enter to add)"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={!!readOnlyReason}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onAdd} disabled={!!readOnlyReason || !draft.trim()}>Add to queue</button>
          <div style={{ flex: 1 }} />
          {state.running ? (
            <button onClick={() => queue.pause()} disabled={!!readOnlyReason}>Pause</button>
          ) : (
            <button className="primary" onClick={() => queue.start()} disabled={!!readOnlyReason || pending === 0}>
              Start
            </button>
          )}
        </div>

        <PanelList state={state} queue={queue} readOnly={!!readOnlyReason} />

        {showSettings && <PanelSettings state={state} queue={queue} readOnly={!!readOnlyReason} />}
      </div>

      <div className="footer">
        <span>{done} sent · {pending} pending · {failed} failed</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/panel/PanelList.tsx`**

```tsx
import { useState } from 'react';
import { QueueApi } from '../queue/queue';
import { QueueItem, QueueState } from '../queue/types';

type Props = { state: QueueState; queue: QueueApi; readOnly: boolean };

export function PanelList({ state, queue, readOnly }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  const beginEdit = (it: QueueItem) => {
    if (readOnly) return;
    setEditingId(it.id);
    setEditText(it.text);
  };

  const commitEdit = () => {
    if (editingId) queue.edit(editingId, editText);
    setEditingId(null);
  };

  return (
    <ul className="list">
      {state.items.map((it, idx) => (
        <li
          key={it.id}
          className={`item ${it.status}`}
          draggable={!readOnly && editingId !== it.id}
          onDragStart={() => setDragFrom(idx)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragFrom != null && dragFrom !== idx) queue.move(dragFrom, idx);
            setDragFrom(null);
          }}
        >
          <div className="item-text" onDoubleClick={() => beginEdit(it)}>
            {editingId === it.id ? (
              <textarea
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    commitEdit();
                  } else if (e.key === 'Escape') {
                    setEditingId(null);
                  }
                }}
              />
            ) : (
              <>{it.text}</>
            )}
            {it.status === 'failed' && (
              <div style={{ marginTop: 4, fontSize: 12, color: '#b91c1c' }}>
                Error: {it.error ?? 'unknown'}
              </div>
            )}
          </div>
          <div className="item-actions">
            {it.status === 'failed' && (
              <>
                <button onClick={() => queue.retry(it.id)} disabled={readOnly}>Retry</button>
                <button onClick={() => queue.skip(it.id)} disabled={readOnly}>Skip</button>
              </>
            )}
            {it.status !== 'sending' && (
              <button onClick={() => queue.remove(it.id)} disabled={readOnly} aria-label="Remove">×</button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Create `src/panel/PanelSettings.tsx`**

```tsx
import { useRef } from 'react';
import { QueueApi } from '../queue/queue';
import { QueueState } from '../queue/types';

type Props = { state: QueueState; queue: QueueApi; readOnly: boolean };

export function PanelSettings({ state, queue, readOnly }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatgpt-queue-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as QueueState;
    if (!Array.isArray(parsed.items)) throw new Error('invalid queue file');
    queue.replace({ ...parsed, running: false, currentId: undefined });
  };

  return (
    <div style={{ borderTop: '1px solid #eee', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>Delay between messages: {(state.delayMs / 1000).toFixed(1)}s</span>
        <input
          type="range"
          min={0}
          max={60_000}
          step={500}
          value={state.delayMs}
          onChange={(e) => queue.setDelay(Number(e.target.value))}
          disabled={readOnly}
        />
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => queue.clearCompleted()} disabled={readOnly}>Clear completed</button>
        <button onClick={exportJson}>Export</button>
        <button onClick={() => fileRef.current?.click()} disabled={readOnly}>Import</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importJson(f).catch((err) => alert('Import failed: ' + err.message));
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: exit 0, `dist/` produced.

- [ ] **Step 5: Commit**

```bash
git add src/panel/Panel.tsx src/panel/PanelList.tsx src/panel/PanelSettings.tsx
git commit -m "feat(panel): full queue UI — list, drag, edit, error controls, settings"
```

---

## Task 13: Wire everything in `content.ts`

**Files:**
- Modify: `src/content/content.ts`

- [ ] **Step 1: Replace `src/content/content.ts`**

```typescript
import { createQueue } from '../queue/queue';
import { DetectorEvent, LOCK_HEARTBEAT_MS, QueueState } from '../queue/types';
import { loadState, saveState, onStateChange } from '../storage/storage';
import { acquireLock, heartbeat, isOwner, onLockChange, releaseLock } from '../storage/lock';
import { createDetector } from './detector';
import { sendMessage } from './sender';
import { mountPanel } from '../panel/mount';
import { uuid } from '../util/uuid';
import { log } from '../util/logger';

let panelHandle: { unmount: () => void } | undefined;

async function bootstrap() {
  if (document.getElementById('chatgpt-queue-host')) return; // already mounted
  log.info('bootstrap start');

  const tabId = uuid();
  const initialState = await loadState();
  const queue = createQueue(initialState);

  // Persist state changes (debounced)
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  queue.subscribe((s) => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void saveState(s);
    }, 250);
  });

  // Cross-tab sync: apply incoming state if we are NOT the owner
  onStateChange(async (s) => {
    if (!(await isOwner(tabId))) queue.replace(s);
  });

  // Lock lifecycle
  let readOnlyReason: string | null = null;
  const reflectOwnership = async () => {
    const mine = await isOwner(tabId);
    readOnlyReason = mine ? null : 'Queue is active in another tab.';
    renderPanel();
  };

  onLockChange(() => void reflectOwnership());

  const heartbeatInterval = setInterval(() => {
    void heartbeat(tabId);
  }, LOCK_HEARTBEAT_MS);

  await acquireLock(tabId);
  await reflectOwnership();

  // Mount panel
  function renderPanel() {
    if (panelHandle) panelHandle.unmount();
    panelHandle = mountPanel(queue, {
      readOnlyReason,
      onTakeOver: async () => {
        // force-claim the lock
        await chrome.storage.local.set({ 'chatgpt-queue:v1:lock': { tabId, heartbeatAt: Date.now() } });
        await reflectOwnership();
      },
    });
  }
  renderPanel();

  // Detector → queue driver
  let pendingRunTimer: ReturnType<typeof setTimeout> | undefined;

  const onEvent = async (ev: DetectorEvent) => {
    if (!(await isOwner(tabId))) return;
    log.debug('detector event', ev);

    if (ev.type === 'error') {
      // If we have a currently-sending item, mark it failed
      const curId = queue.state.currentId;
      if (curId) queue.markFailed(curId, ev.code);
      queue.pause();
      return;
    }

    if (ev.type === 'generating') {
      // If nothing is tracked as sending but generation is live, we don't flip anything —
      // the user might have sent manually. Respect it.
      return;
    }

    if (ev.type === 'idle') {
      const curId = queue.state.currentId;
      if (curId) queue.markDone(curId);
      maybeFireNext();
    }
  };

  const maybeFireNext = () => {
    if (pendingRunTimer) clearTimeout(pendingRunTimer);
    if (!queue.state.running) return;
    const next = queue.nextPending();
    if (!next) return;
    pendingRunTimer = setTimeout(async () => {
      if (!queue.state.running) return;
      const item = queue.nextPending();
      if (!item) return;
      queue.markSending(item.id);
      const result = await sendMessage(item.text);
      if (!result.ok) {
        queue.markFailed(item.id, result.code);
        queue.pause();
      }
      // On success we wait for the detector's idle event to markDone.
    }, queue.state.delayMs);
  };

  // Re-evaluate firing when queue state changes (user pressed Start, edited delay, etc.)
  queue.subscribe(() => maybeFireNext());

  const detector = createDetector(onEvent);
  detector.start();

  window.addEventListener('pagehide', () => {
    clearInterval(heartbeatInterval);
    void releaseLock(tabId);
    detector.stop();
    panelHandle?.unmount();
  });
}

// Extend mountPanel signature — see Step 2 below
declare module '../panel/mount' {
  export function mountPanel(
    queue: import('../queue/queue').QueueApi,
    opts?: { readOnlyReason?: string | null; onTakeOver?: () => void },
  ): { unmount: () => void };
}

void bootstrap();
```

- [ ] **Step 2: Update `src/panel/mount.tsx`** to pass through options

Replace the contents of `src/panel/mount.tsx` with:

```tsx
import { createRoot, Root } from 'react-dom/client';
import { Panel } from './Panel';
import { QueueApi } from '../queue/queue';
import { detectTheme, onThemeChange } from './theme';
import panelCss from './panel.css?raw';

export type PanelOptions = {
  readOnlyReason?: string | null;
  onTakeOver?: () => void;
};

export type PanelHandle = { unmount: () => void };

export function mountPanel(queue: QueueApi, opts: PanelOptions = {}): PanelHandle {
  const host = document.createElement('div');
  host.id = 'chatgpt-queue-host';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = panelCss;
  shadow.appendChild(style);
  const container = document.createElement('div');
  shadow.appendChild(container);

  const setTheme = (t: 'light' | 'dark') => host.setAttribute('data-theme', t);
  setTheme(detectTheme());
  const offTheme = onThemeChange(setTheme);

  const root: Root = createRoot(container);
  root.render(<Panel queue={queue} readOnlyReason={opts.readOnlyReason ?? null} onTakeOver={opts.onTakeOver} />);

  return {
    unmount: () => {
      offTheme();
      root.unmount();
      host.remove();
    },
  };
}
```

- [ ] **Step 3: Remove the now-redundant `declare module` block from `content.ts`**

Delete the `declare module '../panel/mount'` block at the bottom of `src/content/content.ts` (Step 1 was defensive; Step 2 made the real signature match).

- [ ] **Step 4: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: exit 0. `dist/manifest.json`, `dist/assets/`, etc.

- [ ] **Step 5: Run full test suite**

Run: `npm test`
Expected: all previously-written tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/content/content.ts src/panel/mount.tsx
git commit -m "feat(content): wire queue, detector, sender, storage, lock, and panel together"
```

---

## Task 14: Manual E2E runbook + load-unpacked verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Append the manual E2E runbook to `README.md`**

```markdown

## Manual E2E runbook (run before every release)

Prereqs: build the extension (`npm run build`), then load `dist/` as an unpacked extension in `chrome://extensions` with Developer Mode enabled. Log in to chatgpt.com.

1. **Panel mounts.** Open https://chatgpt.com — a collapsed pill appears bottom-right. Click it; the panel expands.
2. **Add messages.** Type three short prompts, pressing "Add to queue" between each. Counter shows `0 sent · 3 pending · 0 failed`.
3. **Auto-send works.** Press Start. First prompt types into ChatGPT's composer and sends. When ChatGPT finishes, the next prompt fires ~2 seconds later. All three complete without intervention.
4. **Pause works.** Add 2 more prompts, press Start, then press Pause while ChatGPT is generating. Generation continues; queue does not fire the next. Press Start again — fires on next idle.
5. **Persistence across refresh.** Add 2 pending prompts (queue paused). Hit F5. After reload, both prompts are still in the panel and the queue is paused.
6. **Persistence across restart.** Close the browser entirely. Reopen. Visit chatgpt.com. Queue items are still there, still paused.
7. **Error handling — network.** DevTools → Network → Offline. Press Start. Queue should transition to ERROR with code `chatgpt-error-toast` or `send-click-ignored`. Retry button works once network is back.
8. **Error handling — selectors.** In DevTools console, run `document.querySelector('#prompt-textarea')?.remove()` before pressing Start. Queue should report ERROR `composer-not-found`.
9. **Two-tab lock.** Open a second ChatGPT tab. The second tab's panel shows "Queue active in another tab" with a Take over button. Press Take over — first tab becomes read-only.
10. **Theme sync.** Toggle ChatGPT's light/dark setting. Panel follows without a refresh.
11. **Settings — delay.** Set delay slider to 0. Next message fires immediately. Set to 10s — next message waits ~10s.
12. **Export/Import.** Export queue → JSON file downloads. Clear queue. Import the file → items reappear.
```

- [ ] **Step 2: Build + manually run through the runbook**

Run: `npm run build`
Then load `dist/` in `chrome://extensions` (Developer Mode → Load unpacked). Walk through all 12 steps above. Note any failures — this is a real manual pass and is the only way to catch selector breakage in live ChatGPT.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: manual E2E runbook"
```

---

## Self-review (reviewer fills in during write-up)

**Spec coverage:**
- §2 scope (injected panel, persistence, lock, delay, error, same-conversation) → Tasks 7, 10, 12, 13, 6, 14
- §4 architecture file layout → Tasks 1, 11, 13
- §5 detection (primary signal, state machine, error signals, selector resilience) → Tasks 8, 9
- §6 sending (ProseMirror contenteditable, dual paths, verification of GENERATING transition) → Task 10
- §7 data model & storage (two keys, debounced 250ms, tab lock with heartbeat) → Tasks 5, 6, 13
- §8 panel UI (collapsed pill, expanded 360px, list with drag/edit/remove, start/pause, settings drawer, footer counts, error overlay) → Tasks 11, 12
- §9 manifest permissions → Task 1
- §10 error taxonomy → Task 2 (types) used by Tasks 9, 10, 13
- §11 testing (unit for queue/storage/selectors/sender/detector, manual E2E runbook) → Tasks 3, 5, 6, 7, 8, 9, 10, 14

**Placeholders:** none — all steps ship actual code and actual commands.

**Type consistency:** `QueueApi`, `QueueState`, `QueueItem`, `ErrorCode`, `DetectorEvent`, `TabLock` defined once in `src/queue/types.ts` and referenced consistently. Storage keys centralised as `STORAGE_KEY_*` constants.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-23-chatgpt-queue-extension.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?

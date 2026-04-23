# ChatGPT Message Queue — Chrome Extension Design

**Date:** 2026-04-23
**Status:** Draft for implementation

## 1. Goal

A Chrome extension for the ChatGPT web app (chatgpt.com) that lets a user queue up many prompts and auto-sends the next one each time ChatGPT finishes responding. The user can step away, come back, and find all answers complete.

## 2. Scope (v1)

**In scope**
- Floating panel injected into chatgpt.com for managing the queue.
- Queue persistence across tab refreshes and browser restarts (manual start/pause).
- Single-tab ownership (only one tab drives the queue at a time).
- Configurable delay between messages (0–60s, default 2s).
- Clear error handling: pause on any anomaly and present Retry / Skip / Stop.
- All queued messages go into whatever ChatGPT conversation is currently open.

**Out of scope (v1)**
- Starting a new chat per message (deferred; user can manually start a new chat before queueing a batch).
- Auto-retry with backoff (deferred; v1 pauses on error).
- Auto-resume of the queue on browser restart (queue is persisted but starts paused).
- Per-message model selection, system-prompt injection, or tool toggles.
- Automated browser-based end-to-end testing.
- **ChatGPT Windows/macOS desktop app support.** Chrome extensions cannot be loaded into the native ChatGPT desktop app; that would require a separate product (Windows UI-automation tool or an Electron wrapper). For users who want an app-like experience, the recommendation is to install chatgpt.com as a PWA from Chrome's menu — the extension still runs in PWA windows since they use the same Chrome runtime.

## 3. Decisions locked in during brainstorming

| Question | Decision |
|---|---|
| Where does the UI live? | Floating panel injected into chatgpt.com |
| Persistence? | Across refreshes + restarts, paused on startup |
| Error behavior? | Stop and wait → Retry / Skip / Stop |
| Pacing between messages? | Configurable delay (0–60s, default 2s) |
| Same conversation or new chat? | Same conversation |

## 4. Architecture

Chrome MV3 extension, content-script heavy. The service worker is not involved in queue execution because all relevant DOM (composer, send button, streaming indicator) lives on chatgpt.com and is only visible to a content script.

```
manifest.json              # MV3 manifest; host permission for https://chatgpt.com/*
src/
  content/
    content.ts             # entry — mounts panel, wires observer/sender/queue
    detector.ts            # MutationObserver-based generating/idle/error detection
    sender.ts              # types into composer + clicks send, verifies transition
    selectors.ts           # prioritized list of DOM selectors (composer, button, errors)
    queue.ts               # queue state machine (idle/running/paused/error)
  panel/
    panel.tsx              # floating panel UI (rendered inside a Shadow DOM root)
    panel.css
  storage/
    storage.ts             # chrome.storage.local wrappers + tab-ownership lock
  types.ts                 # shared TypeScript types
  util/
    logger.ts              # namespaced console logger, toggleable via setting
tests/
  queue.test.ts
  storage.test.ts
  detector.test.ts         # runs against recorded DOM fixtures
```

**Shadow DOM panel:** the panel mounts inside a shadow root so ChatGPT's CSS cannot leak into our UI (and vice versa). Theme is picked up from `document.documentElement.classList` (light/dark).

**Build:** Vite + `@crxjs/vite-plugin` (verified current as of 2026 via Context7 — manifest authored via `defineManifest()` in `manifest.config.ts`), TypeScript, React + `@vitejs/plugin-react` for the panel. React is overkill for a panel this small but makes state wiring to the queue straightforward; if bundle size becomes an issue we can swap for Preact. CRXJS gives us HMR for content scripts during development.

## 5. Detection — is ChatGPT still generating?

This is the riskiest piece because ChatGPT's DOM changes. The strategy is to use multiple signals, prefer the most stable, and fall back loudly when everything breaks.

**Primary signal: composer submit-button state.**
ChatGPT's composer has a single button that toggles between "Send" and "Stop streaming" during generation. We observe it via `MutationObserver`. Candidate selectors, in priority order (lives in `selectors.ts`):

1. `button[data-testid="send-button"]` vs `button[data-testid="stop-button"]`
2. `button[aria-label="Send prompt"]` vs `button[aria-label="Stop streaming"]`
3. `#composer-submit-button` with children/classes inspected
4. Fallback: the last `<button>` inside the form enclosing the contenteditable composer

**State machine (`queue.ts`):**

```
IDLE ──sendNext()──▶ GENERATING
GENERATING ──stop-button-absent for IDLE_STABILITY_MS (default 800ms)──▶ IDLE
GENERATING ──error signal──▶ ERROR
ERROR ──user: Retry──▶ GENERATING
ERROR ──user: Skip──▶ IDLE (advance queue)
ERROR ──user: Stop──▶ PAUSED
RUNNING + IDLE ──delayMs elapsed──▶ sendNext()
```

The 800ms idle-stability debounce prevents firing during a brief DOM flicker between tokens.

**Error signals:**
- A toast / `[role="alert"]` element whose text matches "error", "rate limit", "usage cap", "try again", "network".
- A "Regenerate" button appearing without a corresponding assistant message (indicates failed generation).
- Navigation to `/auth` or login wall (`window.location` watcher).

On error, the queue transitions to ERROR, the current item is tagged `failed`, and the panel shows inline Retry / Skip / Stop controls on that item.

**Selector resilience:** if no selector in the priority list matches on startup or for >10s while the queue is running, the detector surfaces a visible "Selectors out of date — please report" badge in the panel and the queue transitions to PAUSED. Never silently wedge.

## 6. Sending a message

The composer is a **ProseMirror contenteditable**, not a `<textarea>`. Setting `.value` does nothing. Procedure in `sender.ts`:

1. Find composer via `div[contenteditable="true"]#prompt-textarea` (with fallbacks from `selectors.ts`).
2. Focus it.
3. Clear existing content: `document.execCommand('selectAll')` → `document.execCommand('delete')`. Fallback path: set `textContent = ''` and dispatch an `input` event of type `deleteContent`.
4. Insert text: `document.execCommand('insertText', false, text)`. ProseMirror listens for `beforeinput` / `input` and updates its internal state. For multi-line messages, split on `\n` and interleave `document.execCommand('insertLineBreak')`.
5. Wait one animation frame (`requestAnimationFrame`).
6. Verify the composer's `textContent` starts with the intended text. If not, retry once via the event-based fallback path. If still empty, transition to ERROR with reason `"composer-write-failed"`.
7. Click the send button.
8. Verify transition into GENERATING state within 2s (i.e., the stop-button selector becomes present). If not, transition to ERROR with reason `"send-click-ignored"`.

**Why execCommand despite being deprecated:** it's still the most reliable way to get ProseMirror to accept programmatic text input in 2026. The event-based fallback exists because Chrome may eventually remove it.

## 7. Data model & storage

```ts
type QueueItemStatus = 'pending' | 'sending' | 'done' | 'failed';

type QueueItem = {
  id: string;             // uuid v4
  text: string;
  status: QueueItemStatus;
  addedAt: number;        // epoch ms
  sentAt?: number;
  error?: string;         // reason code when status === 'failed'
};

type QueueState = {
  items: QueueItem[];
  running: boolean;       // user pressed Start
  delayMs: number;        // default 2000
  currentId?: string;
};

type TabLock = {
  tabId: string;          // uuid assigned to this tab on mount
  heartbeatAt: number;    // epoch ms; refreshed every 3s while mounted
};
```

Persisted under two `chrome.storage.local` keys:
- `chatgpt-queue:v1:state` → `QueueState` (debounced 250ms on write)
- `chatgpt-queue:v1:lock` → `TabLock`

**Cross-tab behavior:** each panel mount generates a tabId and writes it to the lock with a heartbeat every 3s. A tab is the owner if the lock is either missing, stale (>10s since heartbeat), or already has its tabId. Other tabs discover ownership changes by subscribing to `chrome.storage.onChanged` (no polling). Non-owner tabs render the panel in read-only mode with a "Queue active in another tab — click to take over" banner. Clicking "take over" writes the current tabId into the lock; the former owner sees the change via `onChanged` and demotes itself. Prevents double-sending.

## 8. Panel UI

**Collapsed (default):** a small pill anchored bottom-right. Shows `▶ 3 queued` with a colored state dot:
- green = idle (or idle-and-queue-empty)
- blue = running (queue processing)
- yellow = paused
- red = error

**Expanded (360px wide):**
- Header: title, status badge, settings gear, collapse/close button. Drag handle to reposition.
- Composer: textarea + "Add to queue" button. `Ctrl+Enter` submits; multi-line supported.
- List: queued items with drag-to-reorder, click-to-edit, `×` to remove. Failed items show red border and inline Retry / Skip / Stop.
- Primary button: Start (when paused) / Pause (when running).
- Settings drawer (collapsible): delay slider (0–60s), clear completed, export/import queue as JSON, verbose-logging toggle.
- Footer: counts — `N sent · N pending · N failed`.

**Positioning:** persisted (x/y, collapsed state) per extension install.

## 9. Permissions (manifest)

```json
{
  "manifest_version": 3,
  "name": "ChatGPT Queue",
  "version": "0.1.0",
  "host_permissions": ["https://chatgpt.com/*"],
  "permissions": ["storage"],
  "content_scripts": [{
    "matches": ["https://chatgpt.com/*"],
    "js": ["src/content/content.ts"],
    "run_at": "document_idle"
  }],
  "action": { "default_title": "ChatGPT Queue" }
}
```

No `activeTab`, no `tabs`, no `scripting` — we don't need them. No background service worker in v1.

## 10. Error taxonomy

Every ERROR carries a reason code surfaced in the UI and logged:

| Code | Meaning | User action |
|---|---|---|
| `composer-not-found` | Couldn't locate composer element | Retry / Stop (maybe page still loading) |
| `composer-write-failed` | Text didn't appear after insert attempts | Retry / Skip |
| `send-button-not-found` | No send button in DOM | Retry / Stop |
| `send-click-ignored` | Clicked send but never entered GENERATING | Retry / Skip |
| `chatgpt-error-toast` | ChatGPT surfaced a visible error | Retry / Skip / Stop |
| `auth-wall` | Redirected to login | Stop (manual re-login needed) |
| `selectors-stale` | No selector candidate matched | Stop (extension update likely needed) |

## 11. Testing

- **Unit (Vitest):** queue state machine transitions, storage serialization round-trip, selector priority resolution, sender step sequence against a mock ProseMirror stub.
- **Integration (jsdom):** detector fed recorded ChatGPT DOM snapshots (idle → generating → idle, idle → generating → error-toast, cold-load selectors-missing).
- **Manual E2E checklist** in README, run before every release:
  1. Load unpacked → verify panel mounts on chatgpt.com.
  2. Add 3 messages → press Start → verify each auto-sends after the previous completes.
  3. Kill network mid-stream → verify transition to ERROR with a reasonable code.
  4. Press Retry → verify recovery.
  5. Refresh the page mid-queue → verify queue state persists and is paused.
  6. Open a second ChatGPT tab → verify second tab shows read-only banner.
  7. Toggle dark/light theme → verify panel follows.
- **No Playwright/real-browser automation in v1:** automating a logged-in ChatGPT session is fragile and borderline against ToS.

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| ChatGPT's DOM changes, breaking selectors | Prioritized selector list + `selectors-stale` error surfaced in UI; no silent wedging |
| Message sent into wrong place (sidebar search, modal, etc.) | Sender explicitly targets composer container; verifies GENERATING transition within 2s |
| Double-send across tabs | Tab-ownership lock with heartbeat |
| Queue fires after user returns and starts a manual conversation | Queue is paused on startup; user must explicitly press Start |
| ChatGPT throttles / shows captcha mid-queue | Detector recognizes error toast + auth-wall; queue pauses |
| ProseMirror rejects programmatic input after a Chrome change | Dual insert paths (execCommand + event-based fallback) with verification |

## 13. Open questions (deferred, not blocking v1)

- How should "regenerate" / "Continue generating" buttons interact with the queue? (v1: ignore; user can manually intervene.)
- Should queue state sync across devices? (v1: no; local only.)
- Telemetry on detector-breakage? (v1: none; users must report manually.)

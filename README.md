# ChatGPT Queue

> A Chrome extension that queues prompts for chatgpt.com and auto-sends the next one when the current response finishes. Step away, come back, get answers.

![MV3](https://img.shields.io/badge/Chrome-MV3-4285F4) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6) ![React 19](https://img.shields.io/badge/React-19-61DAFB) ![Tests](https://img.shields.io/badge/tests-44%20passing-10a37f) ![License: MIT](https://img.shields.io/badge/License-MIT-yellow)

---

## What it does

You queue up a list of prompts. You press **Start**. The extension:

1. Types the first prompt into ChatGPT's composer and clicks Send.
2. Watches the DOM for ChatGPT to finish streaming its reply.
3. Waits a configurable delay (default 2s), then sends the next prompt.
4. Repeats until the queue drains, pauses on error, or you stop it.

When anything goes wrong — a rate-limit toast, a lost send click, a selector that no longer matches — the queue halts and surfaces inline **Retry / Skip / Stop** controls on the failed item, so you never silently lose prompts.

## Why

ChatGPT's web UI only lets you send one prompt at a time and wait. If you have ten things to ask it — researching a topic, drafting a batch of replies, running the same question against different framings — you have to babysit the tab. This extension lets you hand off that babysitting.

## Install

### From Chrome Web Store
_(Listing pending.)_

### From source (developer mode)

```bash
git clone https://github.com/LaNguAx/ChatGPT-Message-Queue-Extension.git
cd ChatGPT-Message-Queue-Extension
npm install
npm run build
```

Then in Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select the generated `dist/` folder.
4. Open <https://chatgpt.com>. A collapsed pill appears in the bottom-right of the page.

## How to use

1. Click the pill to expand the panel.
2. Type a prompt in the textarea. Press **Add to queue** (or `Ctrl+Enter`). Repeat for each prompt.
3. Press **Start**. The first prompt fires immediately; subsequent prompts fire ~2 seconds after each response finishes.
4. Press the gear (⚙) to change the delay, clear completed items, or export/import the queue as JSON.

Each item in the list shows its status: `pending`, `sending`, `done`, or `failed` (with an inline error code and Retry/Skip controls).

## Features

- **Multi-prompt queue** with drag-to-reorder, double-click-to-edit, and per-item remove.
- **Auto-send** triggered by a MutationObserver watching ChatGPT's "Stop streaming" button.
- **Configurable delay** between messages (0–60 s).
- **Per-tab isolation** — every ChatGPT tab has its own independent queue. Open 10 tabs, run 10 queues in parallel.
- **Persistent within a tab** — queue survives page refresh (sessionStorage). Cleared when the tab closes.
- **Start paused** — on load, the queue never auto-fires. You always press Start explicitly.
- **Error recovery** — on any anomaly (network error, rate-limit toast, composer missing, send click ignored), the queue pauses with a specific error code and inline Retry / Skip / Stop.
- **Shadow DOM panel** — fully isolated from ChatGPT's CSS. Light/dark theme auto-follows ChatGPT.
- **Export / import** — download your queue as JSON, load it into another tab.

## How it works

The entire extension runs as a single content script injected at `document_idle` on `https://chatgpt.com/*`. There is no background service worker, no remote code, no external network calls.

```
src/
├── content/              ← injected into chatgpt.com
│   ├── content.ts        — entry; wires queue, detector, sender, panel together
│   ├── selectors.ts      — prioritised CSS selectors for composer/send/stop/errors
│   ├── detector.ts       — MutationObserver emitting idle / generating / error events
│   └── sender.ts         — writes text into the ProseMirror composer and clicks Send
├── queue/
│   ├── queue.ts          — pure state machine (add, remove, edit, move, mark*, subscribe)
│   └── types.ts          — shared types, storage keys, timing constants
├── storage/
│   └── storage.ts        — sessionStorage round-trip for QueueState
├── panel/                ← React 19 UI, rendered into a Shadow DOM root
│   ├── mount.tsx         — creates Shadow DOM host + React root + theme sync
│   ├── Panel.tsx         — top-level panel (collapsed pill ⇄ expanded body)
│   ├── PanelList.tsx     — queue list with drag/edit/retry/skip/remove
│   ├── PanelSettings.tsx — delay slider, export/import, clear completed
│   ├── theme.ts          — detect + follow ChatGPT's light/dark class
│   └── panel.css         — all panel styles (injected as raw text into shadow root)
└── util/
    ├── uuid.ts           — UUID v4 helper
    └── logger.ts         — namespaced console logger
```

### Queue state machine

The queue lives in memory (instance of `QueueApi` in `content.ts`). Every mutation notifies subscribers: the React panel re-renders, and a 250 ms-debounced writer persists the state to `sessionStorage`.

Sending is gated behind two flags:

- `sending` — a synchronous boolean set before `sendMessage()` and cleared in a `finally`
- `currentId` — the id of the item whose send is in-flight

`maybeFireNext()` refuses to fire a new item while either is set, so every queue mutation (including `markSending`) is safe to re-trigger it. This prevents the classic "fire two sends at once" race.

### Detection

The detector watches `document.body` with a `MutationObserver` and reacts to:

- **Stop-streaming button present** → emits `generating`
- **Stop-streaming button absent for ≥800 ms** → emits `idle`
- **Error toast matching `/\b(error|rate.?limit|usage cap|try again|network)\b/i`** → emits `error` with code `chatgpt-error-toast`
- **URL path starts with `/auth`** → emits `error` with code `auth-wall`
- **No known selector found for > 15 s** → emits `error` with code `selectors-stale` (serves as a canary for DOM-regression bugs)

Selectors are stored as a prioritised list in `src/content/selectors.ts`. Adding a fallback selector is the usual fix when ChatGPT's DOM changes.

### Sending

ChatGPT's composer is a ProseMirror `contenteditable`. Setting `.value` does nothing. The sender uses two paths in sequence:

1. **`document.execCommand('insertText')`** — synthesises the `beforeinput` event ProseMirror expects. Reliable across Chrome versions as of 2026.
2. **Synthetic `InputEvent`** fallback — used if `execCommand` ever fails.

After writing, the sender tolerates whitespace differences in the composer's `textContent` (ProseMirror collapses `\n` into spaces when reading back) and accepts any non-empty composer content as "written successfully" — the real failure detector is whether the stop-streaming button appears within 2 s of the click.

## Error codes

| Code | Meaning | Common cause |
|---|---|---|
| `composer-not-found` | Couldn't locate the composer element | Page still loading; selector out of date |
| `composer-write-failed` | Composer is empty after write | Both `execCommand` and event paths failed |
| `send-button-not-found` | No send button in DOM | Composer empty; selector out of date |
| `send-click-ignored` | Clicked Send but no streaming started | Network issue, rate limit, session expired |
| `chatgpt-error-toast` | ChatGPT surfaced a visible error | Rate limit, network, usage cap |
| `auth-wall` | URL redirected to `/auth` | Login expired |
| `selectors-stale` | No composer/send/stop found for 15 s | ChatGPT updated its DOM; needs a selector patch |

When any error fires, the queue pauses and the failed item shows inline **Retry / Skip / Stop** controls.

## Known limitations

- **Same-tab, same-chat only.** If you switch chats within a tab while a queue is running, the queue keeps firing into whatever chat is open. Per-chat isolation is not yet implemented.
- **No ChatGPT desktop app support.** Chrome extensions don't load into OpenAI's native apps. For a desktop-window feel, install chatgpt.com as a PWA from Chrome's menu — the extension runs there.
- **Queue is per-tab.** Closing the tab clears its queue. Refreshing the tab preserves it.
- **Tests are against recorded DOM.** Live ChatGPT selectors are verified manually via the runbook below; if OpenAI ships a DOM change, expect a brief selector update.

## Development

```bash
npm install
npm run dev         # Vite + CRXJS; rebuilds on file change — reload extension to pick up
npm run build       # production build into dist/
npm test            # Vitest (jsdom environment)
npm run typecheck   # tsc --noEmit
```

After `npm run dev` or `npm run build`, point `chrome://extensions` → "Load unpacked" at the generated `dist/` folder. Reload the extension after each rebuild.

### Tech stack

- **Vite 7** with **`@crxjs/vite-plugin` 2.x** for MV3 bundling
- **TypeScript 5.x** with `strict` + `noUncheckedIndexedAccess`
- **React 19** rendered into a Shadow DOM root
- **Vitest 3** with jsdom for unit tests
- **Sessionstorage**-backed per-tab persistence (no `chrome.storage`, no network, no background worker)

### Running the manual E2E runbook

Unit tests cover the pure logic; live DOM behaviour has to be verified in a real browser. Before releasing:

1. `npm run build`
2. Load `dist/` unpacked in `chrome://extensions`.
3. Walk through the runbook in `docs/superpowers/specs/` — twelve manual steps covering mount, add, auto-send, pause, persistence, error handling, two-tab isolation, theme sync, delay slider, and export/import.

### Customising the icon

The extension ships with a single 128 × 128 PNG (Chrome scales it for smaller UI slots). To replace it:

1. Edit `public/icons/icon.svg`.
2. Re-rasterise to PNG at 128 × 128 with any tool (Figma, Inkscape, online SVG-to-PNG).
3. Save as `public/icons/icon-128.png`.

No rebuild needed — the PNG is copied into `dist/` on the next `npm run build`.

## Project structure

```
.
├── manifest.config.ts        — CRXJS defineManifest() call
├── vite.config.ts            — Vite + React + CRXJS
├── vitest.config.ts          — Vitest + jsdom
├── tsconfig.json             — strict + noUncheckedIndexedAccess
├── package.json
├── public/icons/             — extension icons
│   ├── icon.svg              — SVG source
│   └── icon-128.png          — rasterised icon referenced by manifest
├── src/                      — see "How it works" above
├── tests/                    — Vitest unit tests
├── docs/superpowers/         — design spec + implementation plan (for contributors)
├── CLAUDE.md                 — guidance for Claude Code agents
├── AGENTS.md                 — guidance for other coding agents
├── LICENSE                   — MIT
└── README.md                 — this file
```

## Contributing

Issues and PRs welcome. Before sending a PR:

1. `npm run typecheck` — exit 0
2. `npm test` — all tests pass
3. `npm run build` — produces a clean `dist/`
4. If you touched selectors, the detector, or the sender, walk the live-DOM runbook.

Follow the existing file boundaries — each module in `src/` has one clear responsibility. Adding features usually means adding a file, not expanding an existing one.

See `CLAUDE.md` and `AGENTS.md` for conventions AI assistants should follow in this repo.

## Privacy & security

- **No network calls.** The extension runs entirely in the content-script sandbox. It doesn't call any external API, analytics, or remote-config service.
- **No `chrome.storage` access.** Queue state lives in `sessionStorage`, which browsers isolate per tab and never sync to the cloud.
- **Minimum permissions.** `host_permissions` is scoped to `https://chatgpt.com/*`. No `tabs`, `scripting`, `activeTab`, `cookies`, or similar.
- **No remote code.** Everything loads from the packaged `dist/` bundle.

## License

[MIT](LICENSE) © 2026 contributors.

## Acknowledgements

Not affiliated with OpenAI. "ChatGPT" is a trademark of OpenAI; used here solely to describe what the extension works with.

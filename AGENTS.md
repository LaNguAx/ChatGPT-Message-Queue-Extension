# AGENTS.md

Guidance for any AI coding agent (Claude Code, OpenAI Codex, Aider, Cursor, etc.) working on this repository.

> **Claude Code users:** `CLAUDE.md` contains the same guidance with Claude-specific details. Both files are kept in sync.

## Project snapshot

- **What:** Chrome MV3 extension that queues prompts for chatgpt.com and auto-sends the next one when the current response finishes.
- **Where it runs:** Content script injected at `document_idle` on `https://chatgpt.com/*`. No background service worker, no remote code, no network calls.
- **Persistence:** `sessionStorage` (per-tab isolation). Queue survives refresh within a tab, not across tab close.
- **UI:** React 19 rendered into a Shadow DOM root so ChatGPT's styles don't leak in and ours don't leak out.

See `README.md` for end-user docs; `docs/superpowers/specs/` for the original design spec; `docs/superpowers/plans/` for the step-by-step implementation plan the codebase was built from.

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install deps (React 19, Vite 7, CRXJS, Vitest 3) |
| `npm run dev` | Vite + CRXJS dev build; rebuilds on file change |
| `npm run build` | Production bundle into `dist/` |
| `npm test` | Vitest with jsdom |
| `npm run typecheck` | `tsc --noEmit` (strict + `noUncheckedIndexedAccess`) |

**Gates for any change:** `npm run typecheck && npm test && npm run build` must all exit 0.

## Module boundaries

Each file in `src/` has one responsibility. Keep them separate.

```
src/
├── content/
│   ├── content.ts        wires queue ↔ detector ↔ sender ↔ panel
│   ├── selectors.ts      prioritised CSS selectors for ChatGPT's DOM
│   ├── detector.ts       MutationObserver → idle / generating / error events
│   └── sender.ts         writes into ProseMirror composer + clicks Send
├── queue/
│   ├── queue.ts          pure state machine (no DOM, no timers, no storage)
│   └── types.ts          shared types + constants
├── storage/
│   └── storage.ts        sessionStorage round-trip for QueueState
├── panel/                React 19 inside a Shadow DOM root
│   ├── mount.tsx         createRoot + theme sync
│   ├── Panel.tsx         top-level (collapsed pill ⇄ expanded)
│   ├── PanelList.tsx     drag / edit / retry / skip / remove
│   ├── PanelSettings.tsx delay slider, export/import, clear
│   ├── theme.ts          follow ChatGPT's light/dark class
│   └── panel.css         all panel styles, injected as raw text
└── util/                 uuid, logger
```

When a change wants to span two files, check whether the boundary is wrong. Usually add a new file rather than expanding an existing one.

## Conventions

- **TypeScript strict** with `noUncheckedIndexedAccess`. `arr[i]` is `T | undefined`; narrow before use.
- **No `chrome.*` APIs.** We deliberately removed all of them during the per-tab refactor. Adding one back requires updating the manifest permissions and breaks our "Extension context invalidated" guarantee.
- **No new dependencies** without a clear reason. Bundle target: under 70 kB gzipped.
- **No emojis** in code, comments, commit messages, or PR descriptions unless the user explicitly asks.
- **Comments explain *why*, not *what*.** The naming does the rest.
- **Conventional Commits:** `feat:`, `fix:`, `refactor:`, `docs:`, `chore:` — subject under 72 chars.
- **TDD for logic changes:** write a failing test, run it to confirm it fails, implement, run to confirm it passes. Commit both together.

## Testing

- **Unit tests (jsdom)** cover pure logic: queue transitions, storage round-trip, selector resolution, detector state machine, sender write+click sequence.
- **Live DOM** behaviour is verified by a 12-step manual runbook in `docs/superpowers/specs/`. Unit tests can't prove the extension works against the real chatgpt.com.
- **Do not disable a test to get CI green.** Fix the test or delete it with a justification in the commit.

## Sensitive / load-bearing code

Review carefully before touching:

1. **`maybeFireNext()` in `src/content/content.ts`** — the `sending` boolean and `currentId` guards prevent a race where every queue mutation re-fires the function during an in-flight send. Three separate bugs converged on this solution. If you change it, add a regression test.
2. **Verification logic in `src/content/sender.ts`** — ProseMirror collapses newlines into spaces when `textContent` is read back. The verification tolerates this and accepts any non-empty composer content. Do not tighten it back to strict equality.
3. **`sendMessage()` path priority** — `execCommand('insertText')` first, `InputEvent` fallback second. Both are required; removing the fallback is a regression risk if Chrome ever drops `execCommand`.
4. **Selector lists in `src/content/selectors.ts`** — prioritised. First match wins. When ChatGPT changes its DOM, add a new selector to the front of the array rather than replacing an existing one.

## When ChatGPT's DOM changes

Symptoms: users report `composer-not-found`, `send-button-not-found`, or `selectors-stale` errors.

Fix procedure:

1. Open https://chatgpt.com in a normal browser.
2. DevTools → inspect the failing element.
3. Prepend a new selector to the relevant array in `src/content/selectors.ts`.
4. Update / add a test fixture in `tests/selectors.test.ts`.
5. `npm run build`, reload the extension, walk the manual runbook.
6. Commit with a `fix(selectors): …` message.

## What not to do

- Do not re-introduce `chrome.storage` or a cross-tab lock. The current per-tab design is intentional.
- Do not add a background service worker without a concrete need. The whole extension works without one.
- Do not skip the manual runbook after touching `selectors.ts`, `detector.ts`, or `sender.ts`.
- Do not generate or edit the 128 px icon at build time. It's a committed asset; if the icon design changes, regenerate manually from `public/icons/icon.svg` and overwrite the PNG.
- Do not add analytics, telemetry, or remote config. The extension is strictly local.

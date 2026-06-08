# CLAUDE.md

Guidance for Claude Code when working on this repository.

## Project

Chrome MV3 extension ("Prompt Queue for ChatGPT") that queues prompts for chatgpt.com and auto-sends the next one when the current response finishes. Single content script, no background worker, no network calls. React 19 panel rendered into a Shadow DOM root. Per-tab isolation via `sessionStorage`. Not affiliated with OpenAI.

See `README.md` for user-facing docs and the [Release QA checklist](README.md#release-qa-checklist) for live-DOM verification.

## Commands

```bash
npm install          # install deps
npm run dev          # Vite + CRXJS dev build (watches src/)
npm run build        # production build into dist/
npm test             # Vitest unit tests (jsdom env)
npm run typecheck    # tsc --noEmit
npm run icons        # rasterise branding/icon.svg -> public/icons/*.png
npm run package      # zip dist/ -> releases/<name>-<version>.zip
```

**After every behaviour change**, run all three gates: `npm run typecheck`, `npm test`, `npm run build`. All three must exit 0. The test suite is the contract — it is faster to read than the code in most cases.

## File boundaries (do not blur)

| Module | Responsibility |
|---|---|
| `src/queue/queue.ts` | Pure state machine. No DOM, no timers, no storage. |
| `src/queue/types.ts` | Shared types + constants (storage keys, timing). Single source of truth. |
| `src/storage/storage.ts` | `sessionStorage` round-trip for `QueueState`. Sync internals, async facade. |
| `src/content/selectors.ts` | Prioritised CSS selectors for ChatGPT's DOM. The only place to patch when ChatGPT's DOM changes. |
| `src/content/detector.ts` | `MutationObserver` state machine emitting `idle` / `generating` / `error`. |
| `src/content/sender.ts` | Writes into the ProseMirror composer and clicks Send. |
| `src/content/content.ts` | Wires everything together. Thin. |
| `src/panel/*.tsx` | React UI, rendered into a Shadow DOM root. |
| `src/popup/index.html` | Static toolbar popup. No JS, no permissions; just points users to chatgpt.com. |
| `src/util/*` | Tiny shared helpers (uuid, logger). |

If a change wants to live across two boundaries, pause and ask whether the boundary is wrong. Usually add a new file rather than expanding an existing one.

## Coding style

- **TypeScript strict + `noUncheckedIndexedAccess`.** Every `arr[i]` returns `T | undefined`. Narrow before use.
- **No emojis in code comments or commit messages** unless the user asks.
- **No `chrome.*` APIs** in this codebase. The refactor to sessionStorage deliberately removed all of them — adding one back is a big change and needs a matching change to the manifest's `permissions`.
- **No new deps** without a clear reason. The entire extension bundle is ~66 kB gzipped; keep it small.
- **No comments explaining what the code does.** Add a comment only when the *why* is non-obvious (subtle invariant, specific workaround, hidden constraint). Well-named identifiers do the rest.
- **No planning/decision docs** in the repo unless the user asks. Work from conversation.
- **Commit style:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`). Keep subject under 72 chars.

## Testing philosophy

- **Tests run in jsdom** (Vitest). They cover the pure logic: queue state transitions, storage round-trip, selector resolution, detector state machine, sender write + click sequence.
- **Live-DOM behaviour is verified manually** against chatgpt.com. The 10-step Release QA checklist in `README.md` is the contract for anything DOM-facing.
- **Write the failing test first** when adding a behaviour. Run the suite to see it fail. Implement. Re-run to see it pass. Commit.
- **Never disable a test to make CI green.** If a test is flaky or wrong, fix its setup or delete it entirely with justification in the commit message.

## Common pitfalls

- **ProseMirror's `textContent` collapses newlines to spaces.** The sender's verification tolerates this; don't tighten the check back to strict equality without re-reading the live-DOM behaviour.
- **MutationObserver fires a lot.** Every callback runs `scan()`. Keep it cheap; don't add heavy work without debouncing.
- **`queue.subscribe(fn)` fires on every mutation** — including `markSending`. The `sending` + `currentId` guards in `maybeFireNext()` prevent the race this would otherwise cause.
- **React state is lost on `root.unmount() + createRoot()`**. Prefer re-rendering with new props.
- **Content scripts in open tabs become orphaned when the extension reloads**, throwing `Extension context invalidated` once for any outstanding `chrome.*` promise. The current build removes all `chrome.*` usage precisely to avoid this.

## When changing selectors

ChatGPT's DOM changes occasionally. When a user reports `composer-not-found` / `send-button-not-found` / `selectors-stale`:

1. Open https://chatgpt.com in a normal browser.
2. DevTools → pick the failing element.
3. Prepend a new selector to the relevant array in `src/content/selectors.ts`.
4. Add or update a test fixture in `tests/selectors.test.ts` if the pattern changes.
5. Rebuild, reload, re-run the [Release QA checklist](README.md#release-qa-checklist).

Selectors are ordered: the first match wins, so put more-specific patterns first.

## What to leave alone

- The `sending` / `currentId` guard logic in `src/content/content.ts`. Three different bugs converged on this; touch with care and add a new test if you change it.
- The sessionStorage-based per-tab design. Switching back to `chrome.storage.local` re-introduces the cross-tab lock problem and is a product regression unless the user asks.
- The Release QA checklist in `README.md`. Live DOM is the ultimate contract; tests alone are not enough.

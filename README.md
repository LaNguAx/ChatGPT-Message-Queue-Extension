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

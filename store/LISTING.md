# Chrome Web Store listing — Prompt Queue for ChatGPT

Copy-paste source for the Web Store Developer Dashboard. Keep this in sync with the manifest.

## Product name

```
Prompt Queue for ChatGPT
```

## Short description (max 132 characters)

```
Queue prompts for ChatGPT and auto-send the next one when the current response finishes. Not affiliated with OpenAI.
```

(116 characters.)

## Category

Productivity

## Language

English (United States)

## Detailed description

```
Prompt Queue for ChatGPT lets you line up several prompts and have them sent to chatgpt.com one after another, automatically. Add your prompts, press Start, and step away. When ChatGPT finishes a response, the next prompt fires after a short, configurable delay. Come back to a finished batch instead of babysitting the tab.

FEATURES
- Multi-prompt queue with drag-to-reorder, double-click-to-edit, and per-item remove.
- Auto-send: the next prompt is sent automatically once the current response finishes streaming.
- Configurable delay between messages (0 to 60 seconds).
- Per-tab isolation: every ChatGPT tab has its own independent queue, so you can run several in parallel.
- Survives page refresh within a tab; cleared when the tab closes.
- Always starts paused. Nothing is ever sent until you press Start.
- Error recovery: if a send fails (rate limit, network blip, login expired, page change), the queue pauses and shows Retry / Skip / Stop on the affected item.
- Light and dark themes that follow ChatGPT automatically.
- Export and import your queue as a JSON file.

PRIVACY
- No data collection. No analytics, no telemetry, no tracking.
- No network requests of its own. Everything runs locally in your browser.
- Queue data lives in per-tab session storage and is cleared when the tab closes.
- Single permission, scoped to chatgpt.com only.

Prompt Queue for ChatGPT is not affiliated with, endorsed by, or sponsored by OpenAI. "ChatGPT" is a trademark of OpenAI, used here only to describe the website the extension works with.
```

## Single purpose (required by Chrome Web Store)

```
The extension has a single purpose: to queue prompts on chatgpt.com and automatically send the next queued prompt once the current ChatGPT response has finished.
```

## Permission justification

`host_permissions` — `https://chatgpt.com/*`

```
This host permission is required so the extension's content script can run on ChatGPT pages, where it places queued text into the message composer and detects when a response has finished generating so the next prompt can be sent. The extension works only on chatgpt.com and requests no other permissions.
```

The extension declares no entries in `permissions` (no tabs, scripting, activeTab, cookies, storage, or background access).

## Privacy practices / data usage disclosure (dashboard answers)

- Does this item collect or use user data? **No.**
- Personally identifiable information: **Not collected.**
- Health, financial, authentication, personal communications, location, web history, user activity: **Not collected.**
- Is data sold to third parties? **No.**
- Is data used or transferred for purposes unrelated to the single purpose? **No.**
- Is data used or transferred to determine creditworthiness or for lending? **No.**

Privacy policy URL (host the repo's `PRIVACY.md`, e.g. via GitHub):

```
https://github.com/LaNguAx/ChatGPT-Message-Queue-Extension/blob/main/PRIVACY.md
```

## Required graphic assets

See [ASSETS.md](ASSETS.md) for exact sizes, destination paths, and image-generation prompts.

- Store icon: 128x128 PNG (`public/icons/icon-128.png`).
- Screenshots: at least one 1280x800 (or 640x400) PNG. Up to five. (`store/screenshots/`).
- Small promo tile (optional but recommended): 440x280 PNG (`store/promo/`).
- Marquee promo tile (optional): 1400x560 PNG (`store/promo/`).

## Submission checklist

1. Create / sign in to a Chrome Web Store developer account and pay the one-time USD 5 registration fee.
2. `npm run build` then `npm run package` to produce `releases/prompt-queue-for-chatgpt-<version>.zip`.
3. In the dashboard, create a new item and upload that zip.
4. Fill in the listing fields above (name, short + detailed description, category, language).
5. Upload the icon, screenshots, and promo tiles from `store/`.
6. Complete the Privacy practices tab using the answers above and add the privacy policy URL.
7. Set distribution (public or unlisted) and regions.
8. Submit for review.

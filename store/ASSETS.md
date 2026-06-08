# Visual asset brief — Prompt Queue for ChatGPT

This is the complete list of image assets needed to publish the extension, plus a copy-paste prompt for an image-generation AI for each one. Generate each asset at the EXACT pixel size listed and save it to the EXACT path listed. When they are all in place, tell the agent and it will wire them up and verify the build.

Hand each prompt block below to your image AI as-is. Do not add text, logos, or watermarks beyond what each prompt asks for.

---

## Brand spec (use for every asset)

- Logo mark: a rounded-corner square filled with a vertical green gradient from `#12b48c` (top) to `#0c8a68` (bottom).
- Inside the mark: three horizontal white rounded bars stacked vertically, each slightly different width, decreasing opacity top to bottom (0.95, 0.80, 0.65) — they represent queued messages. A solid white right-pointing play triangle sits at the lower-right, representing auto-send.
- Accent green for buttons / highlights: `#10a37f` (hover `#0e8f6e`).
- Typography: clean modern sans-serif (system UI / Inter / Roboto). No serif fonts.
- Tone: minimal, flat, high-contrast, professional. No photorealism, no 3D, no drop-shadow clutter, no emojis, no stock photography, no busy backgrounds.
- Do NOT use the OpenAI logo or the ChatGPT wordmark/logo anywhere. The brand mark above is the only logo.
- Where a tagline is allowed: "Queue prompts. Auto-send when done."

---

## 1. Extension icons

Status: these are ALREADY auto-generated from `branding/icon.svg` via `npm run icons`, and they are crisp. Only generate these with an image AI if you want a different design. If you do, keep the brand mark above and the exact sizes/paths below; then re-check that they still read clearly at 16x16.

| File | Size | Destination path |
|---|---|---|
| icon-16.png | 16x16 | `public/icons/icon-16.png` |
| icon-32.png | 32x32 | `public/icons/icon-32.png` |
| icon-48.png | 48x48 | `public/icons/icon-48.png` |
| icon-128.png | 128x128 | `public/icons/icon-128.png` |

Prompt (only if redesigning):

```
A flat, minimal app icon, 128x128, no text. A rounded-corner square (corner radius ~20% of the side) filled with a smooth vertical gradient from #12b48c at the top to #0c8a68 at the bottom. Centered inside: three horizontal white rounded bars stacked vertically with small gaps, widths roughly 64, 74, and 50 percent, opacities 0.95, 0.80, 0.65 top to bottom. A solid white right-pointing play triangle in the lower-right area. High contrast, must remain legible when scaled down to 16x16. Transparent or solid background outside the square does not matter since the square fills the canvas. No OpenAI logo, no letters, no shadows, no gradients other than the green one described.
```

---

## 2. Store screenshots (need at least 1, up to 5)

Generate clean UI mockups that match the real extension UI described below. These appear on the store listing.

Real UI to depict accurately:
- The page behind is a ChatGPT-style chat interface, DARK theme (very dark gray background ~`#1f1f1f`, a centered conversation column, a message composer text box near the bottom-center).
- The extension's panel floats in the BOTTOM-RIGHT corner. It is 360px wide, dark gray (`#1f2023`), rounded corners (10px), subtle shadow, thin border.
- Panel header row: a small colored status dot, the title text "Prompt Queue", and on the right a gear icon button and a "—" collapse button.
- Below the header: a multi-line text input with placeholder "Type a prompt...  (Ctrl+Enter to add)".
- A button row: a gray "Add to queue" button on the left, and a green "Start" button (`#10a37f`, white text) on the right.
- A vertical list of queued items. Each item is a rounded card showing the prompt text and a small "x" remove control. Item states: normal (pending), a green-tinted/blue-border item (sending), a dimmed item (done), and a red-bordered item with small red "Error: ..." text plus "Retry" and "Skip" buttons (failed).
- A footer line in small muted text: "2 sent - 3 pending - 0 failed" style counts.
- The collapsed state (for the hero) is just a small green rounded "pill" in the bottom-right showing a play/pause glyph and a count like "3 queued".

### 2a. Hero / collapsed pill

| File | Size | Destination path |
|---|---|---|
| screenshot-01-hero.png | 1280x800 | `store/screenshots/screenshot-01-hero.png` |

```
A 1280x800 product screenshot, dark theme. Background: a clean ChatGPT-style chat web page in dark mode (dark gray ~#1f1f1f, a centered conversation column with a couple of neutral placeholder chat bubbles, and a rounded message composer box near the bottom center). In the bottom-right corner, a small rounded "pill" button with a green gradient (#12b48c to #0c8a68), white text reading "3 queued" preceded by a small white play triangle, and a tiny status dot. Minimal, flat, modern, no real text content in the chat, no OpenAI logo, no watermark. Crisp UI mockup, not photorealistic.
```

### 2b. Expanded queue panel

| File | Size | Destination path |
|---|---|---|
| screenshot-02-queue-panel.png | 1280x800 | `store/screenshots/screenshot-02-queue-panel.png` |

```
A 1280x800 product screenshot, dark theme. Same dark ChatGPT-style page in the background. In the bottom-right, an expanded floating panel, 360px wide, dark gray (#1f2023), rounded corners, subtle shadow. Top of panel: a small green status dot, the title "Prompt Queue", and on the right a gear icon and a long-dash collapse button. Below: a text input with faint placeholder "Type a prompt...". A button row with a gray "Add to queue" button and a green "Start" button (#10a37f, white text). Below that, a vertical list of 4 rounded item cards containing short generic prompt texts; show two as normal pending, one dimmed as "done", and one with a blue left edge labeled as sending. A small muted footer line reading "1 sent - 3 pending - 0 failed". Clean flat modern UI mockup, no OpenAI logo, no watermark.
```

### 2c. Error recovery / auto-send

| File | Size | Destination path |
|---|---|---|
| screenshot-03-auto-send.png | 1280x800 | `store/screenshots/screenshot-03-auto-send.png` |

```
A 1280x800 product screenshot, dark theme. Same dark ChatGPT-style page. The floating panel (bottom-right, 360px wide, dark gray, rounded) shows the queue list where one item card has a red border with small red text "Error: send-click-ignored" and two small buttons "Retry" and "Skip"; the other items look normal. The green "Start" button has changed to a gray "Pause" button to suggest a run in progress. Muted footer line "2 sent - 1 pending - 1 failed". Clean flat modern UI mockup, high contrast, no OpenAI logo, no watermark.
```

---

## 3. Promo tiles

### 3a. Small promo tile (recommended)

| File | Size | Destination path |
|---|---|---|
| small-promo-440x280.png | 440x280 | `store/promo/small-promo-440x280.png` |

```
A 440x280 marketing tile with a deep green background gradient (#0c8a68 to #12b48c). Left side: the app logo mark (rounded green square containing three stacked white bars of decreasing opacity and a white play triangle lower-right). Right side: bold white text "Prompt Queue for ChatGPT" on two lines, with a smaller lighter tagline beneath: "Queue prompts. Auto-send when done." Flat, minimal, lots of breathing room, no OpenAI logo, no watermark, no photo.
```

### 3b. Marquee promo tile (optional)

| File | Size | Destination path |
|---|---|---|
| marquee-1400x560.png | 1400x560 | `store/promo/marquee-1400x560.png` |

```
A 1400x560 wide marketing banner. Left third: a deep green panel (gradient #0c8a68 to #12b48c) with the app logo mark and the title "Prompt Queue for ChatGPT" in bold white, plus the tagline "Queue prompts. Auto-send when done." in lighter white. Right two-thirds: a clean dark-mode mockup of the extension's floating queue panel (dark gray, rounded, a short list of queued prompt cards, a green Start button) sitting over a faint dark ChatGPT-style page. Flat, modern, high contrast, no OpenAI logo, no watermark, no photorealism.
```

---

## Where everything goes (summary)

```
public/icons/
  icon-16.png    (16x16)    auto-generated; replace only to redesign
  icon-32.png    (32x32)    auto-generated; replace only to redesign
  icon-48.png    (48x48)    auto-generated; replace only to redesign
  icon-128.png   (128x128)  auto-generated; also used as the store icon

store/screenshots/
  screenshot-01-hero.png         (1280x800)  required (at least one screenshot)
  screenshot-02-queue-panel.png  (1280x800)  recommended
  screenshot-03-auto-send.png    (1280x800)  recommended

store/promo/
  small-promo-440x280.png   (440x280)   recommended
  marquee-1400x560.png      (1400x560)  optional
```

The `public/icons/*` PNGs ship inside the extension build. Everything under `store/` is uploaded directly in the Chrome Web Store dashboard and is NOT bundled into the extension.

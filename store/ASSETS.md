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

Real UI to depict accurately (current redesigned UI):
- The page behind is a ChatGPT-style chat interface, DARK theme (near-black background, a centered conversation column with neutral placeholder bubbles, a rounded message composer near the bottom center).
- The extension's panel floats in the BOTTOM-RIGHT corner. It is about 360px wide, a dark gray surface (`#26282c`), 16px rounded corners, a soft drop shadow, and a thin 1px border (`#34373d`).
- Panel header: on the LEFT a small rounded-square logo mark with a green gradient (`#12b48c` to `#0c8a68`) containing three white horizontal bars of decreasing opacity plus a small white play triangle, then the title "Prompt Queue" in white semibold, then a small green status dot. On the RIGHT two subtle (transparent) icon buttons: a "settings" sliders icon (two horizontal lines each with a small round knob) and a minimize dash.
- Compose area: a rounded multi-line input (slightly lighter inset `#2d2f34`) with placeholder "Type a prompt...  (Ctrl+Enter to add)"; below it a row with a subtle "Add to queue" button on the left and a green primary button on the right that reads "Start" (with a small play triangle) or "Pause" (with a small pause glyph). Accent green is `#19b894` in dark mode.
- Queue list: each item is its own rounded card (`#26282c`) containing, left to right: a faint six-dot drag handle, a small circular status icon, the prompt text, and a small "x" remove control on the right. Status icon + card states:
  - pending: a muted gray clock outline
  - sending: a blue spinner arc; the card has a faint blue tint
  - done: a green check; the card is dimmed and its text has a strikethrough
  - failed: a red warning triangle; the card has a faint red tint, a small red "Error: send-click-ignored" line under the text, and small "Retry" and "Skip" buttons
  - reordering: a thin green accent line across the TOP edge of a card shows where a dragged item will drop
- Footer: three small rounded pill chips reading like "1 sent", "2 pending", "1 failed". The "sent" chip turns green and the "failed" chip turns red when their count is greater than zero; "pending" stays neutral gray.
- Optional settings drawer (below the list): a "Delay between messages" label with a value like "2.0s", a thin green slider, and small "Clear completed / Export / Import" buttons.
- Collapsed state (for the hero): a small rounded "pill" in the bottom-right containing the green logo mark, a small status dot, the word "Queue", and a small green circular count badge (e.g., "3").
- Style for all screenshots: flat, modern, crisp UI mockup (not photorealistic), high contrast, no OpenAI logo, no watermark, no real user data.

### 2a. Hero / collapsed pill

| File | Size | Destination path |
|---|---|---|
| screenshot-01-hero.png | 1280x800 | `store/screenshots/screenshot-01-hero.png` |

```
A 1280x800 product screenshot, dark theme, crisp flat UI mockup (not photorealistic). Background: a clean ChatGPT-style chat web page in dark mode (near-black background, a centered conversation column with a couple of neutral gray placeholder chat bubbles, and a rounded message composer box near the bottom center). In the bottom-right corner, a small rounded white-bordered "pill" on a dark surface (#26282c) containing: a small rounded-square logo mark with a green gradient (#12b48c to #0c8a68) holding three white horizontal bars of decreasing opacity and a tiny white play triangle, then a small green status dot, then the word "Queue" in light text, then a small green circular badge with the number "3". Soft shadow under the pill. No real text content in the chat, no OpenAI logo, no watermark.
```

### 2b. Expanded queue panel

| File | Size | Destination path |
|---|---|---|
| screenshot-02-queue-panel.png | 1280x800 | `store/screenshots/screenshot-02-queue-panel.png` |

```
A 1280x800 product screenshot, dark theme, crisp flat UI mockup. Same dark ChatGPT-style page in the background. In the bottom-right, an expanded floating panel about 360px wide, dark gray surface (#26282c), 16px rounded corners, soft shadow, thin border. Header: a small rounded-square green-gradient logo mark (three white bars of decreasing opacity + a tiny white play triangle), the title "Prompt Queue" in white semibold, a small green status dot, and on the far right two faint icon buttons (a sliders "settings" icon and a minimize dash). Below the header: a rounded text input (slightly lighter inset) with faint placeholder "Type a prompt...", then a row with a subtle "Add to queue" button on the left and a green "Start" button with a small play triangle on the right (accent green #19b894). Below that, a vertical list of 4 rounded item cards; each card has a faint six-dot drag handle on the left, a small circular status icon, short generic prompt text, and a faint "x" on the right. Make one card "done" (dimmed, green check, text with a strikethrough), one "sending" (faint blue tint, small blue spinner), and two "pending" (muted gray clock icon); show a thin green accent line across the top edge of one pending card to indicate a drag drop position. Footer: three small rounded pill chips reading "1 sent" (green), "2 pending" (gray), "0 failed" (gray). No OpenAI logo, no watermark.
```

### 2c. Error recovery / auto-send

| File | Size | Destination path |
|---|---|---|
| screenshot-03-auto-send.png | 1280x800 | `store/screenshots/screenshot-03-auto-send.png` |

```
A 1280x800 product screenshot, dark theme, crisp flat UI mockup. Same dark ChatGPT-style page. The floating panel (bottom-right, about 360px wide, dark gray #26282c, 16px rounded, soft shadow) with the "Prompt Queue" header (green logo mark, title, green status dot, sliders + minimize icons). The compose row shows a subtle "Add to queue" button and, because a run is in progress, a "Pause" button (with a small pause glyph) instead of Start. The queue list shows several rounded item cards: one "done" (dimmed, green check, strikethrough text), one "sending" (faint blue tint, blue spinner), one "pending" (gray clock), and one "failed" card with a faint red tint, a red warning-triangle status icon, a small red line reading "Error: send-click-ignored", and two small "Retry" and "Skip" buttons. Footer: three small pill chips reading "2 sent" (green), "1 pending" (gray), "1 failed" (red). High contrast, no OpenAI logo, no watermark.
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
A 1400x560 wide marketing banner. Left third: a deep green panel (gradient #0c8a68 to #12b48c) with the app logo mark and the title "Prompt Queue for ChatGPT" in bold white, plus the tagline "Queue prompts. Auto-send when done." in lighter white. Right two-thirds: a clean dark-mode mockup of the redesigned floating queue panel (dark gray #26282c, 16px rounded, soft shadow) with a "Prompt Queue" header (green logo mark + title + sliders/minimize icons), a short list of rounded prompt cards each with a six-dot drag handle and a circular status icon (a green check, a blue spinner, gray clocks), a green "Start" button, and small footer pill chips, sitting over a faint dark ChatGPT-style page. Flat, modern, high contrast, no OpenAI logo, no watermark, no photorealism.
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

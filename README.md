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

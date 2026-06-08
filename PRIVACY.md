# Privacy Policy — Prompt Queue for ChatGPT

_Last updated: 2026-06-08_

Prompt Queue for ChatGPT ("the extension") is a browser extension that queues prompts on chatgpt.com and sends them one at a time. This policy explains what the extension does and does not do with your data.

## Summary

**The extension collects nothing, sends nothing, and stores nothing outside your own browser tab.**

## What data the extension handles

The only data the extension touches is the prompt text you type into its panel and the queue's settings (such as the delay between messages). This data:

- Is stored in the browser's `sessionStorage`, which is isolated to a single tab and is cleared automatically when you close that tab.
- Never leaves your device. The extension makes no network requests of its own and contains no analytics, telemetry, tracking, advertising, or remote-configuration code.
- Is never transmitted to the developer or any third party.

## What data the extension does NOT collect

- No personally identifiable information.
- No health, financial, authentication, or location data.
- No browsing history.
- No web-form contents other than the prompts you explicitly add to the queue.
- No data is sold or shared with anyone.

## Permissions

The extension requests a single host permission, `https://chatgpt.com/*`, which is required to run its content script on ChatGPT pages so it can place text into the composer and detect when a response has finished. It requests no other permissions (no `tabs`, `scripting`, `activeTab`, `cookies`, `storage`, or background access).

## Third parties

The extension is not affiliated with, endorsed by, or sponsored by OpenAI. "ChatGPT" is a trademark of OpenAI and is used only to describe the website the extension works with.

## Changes to this policy

If this policy changes, the updated version will be published in this repository with a new "Last updated" date.

## Contact

Questions or concerns: open an issue at
https://github.com/LaNguAx/ChatGPT-Message-Queue-Extension/issues

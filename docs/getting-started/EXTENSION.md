# Getting Started — Chrome Extension (Promptify)

Browser extension that brings the optimizer inline to ChatGPT itself. It
watches the input field and conversation, displays live word counts, and
replaces your prompt in place when you click *Optimize*.

![Promptify popup](../screenshots/chrome%20extension%20screenshot.png)

## Prerequisites

1. The COP-X backend must be running locally on
   `http://localhost:3000`. See
   [Getting Started — Web UI](./WEB.md) for setup, then `npm start`.
2. Google Chrome (or any Chromium-based browser supporting Manifest V3).

## Install (developer mode)

1. Open `chrome://extensions` in Chrome.
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked** and select the
   [`extension/`](../../extension) directory in this
   repository.
4. Promptify will appear in the extensions list. Pin it to your toolbar.

The extension only runs on `https://chatgpt.com/*` — the manifest scopes
its content script and host permissions to that domain.

## What you get

Open ChatGPT, click the Promptify icon, and the popup shows two cards:

| Card | What it counts |
| --- | --- |
| **Current Input** | Words in the prompt textarea you are typing |
| **Context Memory** | Words in the entire conversation so far |

The numbers update live as you type and as the assistant streams replies.

### Toolbar badge

The extension also surfaces the same state on its toolbar icon, so you do
not have to open the popup to know things are getting heavy.

| Badge | Meaning |
| --- | --- |
| *(no badge)* | Both counts are below the yellow threshold |
| **!** on yellow background | One of the two counts crossed its yellow threshold |
| **!** on red background | One of the two counts crossed its red threshold |
| **2** on red/yellow | Both crossed thresholds |

Thresholds default to: input yellow at 500 words, input red at 1,000;
context yellow at 5,000 words, context red at 30,000. They are
configurable in the popup settings (gear icon).

## Two actions

### Optimize current prompt

The 🔄 button on the **Current Input** card sends your prompt to the
backend's `/api/shorten`, then replaces the text in ChatGPT's input field
with the compressed version. After a successful optimization:

- The button switches to ↩️ — click it again to revert to the original.
- A green badge appears showing how many tokens you saved.

### Start in new chat

The ↗️ button on the **Context Memory** card appears once the conversation
crosses the yellow threshold. Clicking it:

1. Sends the full transcript to `/api/summarize`.
2. Stores the bootstrap summary in extension storage.
3. Opens a new ChatGPT tab.
4. Auto-injects the summary as the first message of the new chat.

You then continue the conversation in the fresh chat at a fraction of the
per-turn cost, without losing problem state.

## Settings

The gear icon opens a settings view where you can change the four
thresholds (input yellow / red, context yellow / red). Settings are
persisted in `chrome.storage.local`.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Status footer shows `SERVER OFFLINE` | Backend isn't running on `localhost:3000`. Run `npm start`. |
| Status footer shows `NOT ON CHATGPT` | Active tab isn't on `chatgpt.com`. The content script only injects there. |
| Status footer shows `ERROR READING CONTEXT` | ChatGPT's DOM changed. Check the selectors in [`content/content.js`](../../extension/content/content.js). |
| Optimize button does nothing | Open DevTools on the popup (right-click → *Inspect*) and check the console for fetch errors. |

## How the pieces fit together

| File | Role |
| --- | --- |
| [`manifest.json`](../../extension/manifest.json) | Manifest V3 declaration, permissions, host scope |
| [`background.js`](../../extension/background.js) | Service worker — updates the toolbar badge based on stored counts |
| [`content/content.js`](../../extension/content/content.js) | Runs on `chatgpt.com`. Scrapes the input and conversation, exposes `GET_INPUT` / `GET_CONVO` / `SET_INPUT` messages, auto-injects pending summaries |
| [`popup/popup.html`](../../extension/popup/popup.html) | Popup UI markup |
| [`popup/popup.css`](../../extension/popup/popup.css) | Popup styles |
| [`popup/popup.js`](../../extension/popup/popup.js) | Popup logic — calls the backend, drives the UI, manages settings |

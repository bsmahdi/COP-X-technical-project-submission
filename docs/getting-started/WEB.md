# Getting Started — Web UI

Browser dashboard for ad-hoc compression and summarization. Best for
trying things out before scripting them or wiring them into the extension.

## Prerequisites

- Node.js 18 or newer
- An OpenAI API key

## Install & run

From the repository root:

```bash
npm install
cp .env.example .env
# edit .env and set OPENAI_API_KEY=sk-...
npm start
```

Open <http://localhost:3000> in your browser.

## Walkthrough

The UI has two textareas — *Input* and *Optimized Output* — and two
buttons.

![Web UI — shorten prompt](../screenshots/shorten%20prompt.png)

1. Paste your text into the left textarea. The *tokens* counter updates
   live as you type (rough estimate, `chars / 4`).
2. Click **Shorten Prompt** to compress a one-shot prompt, or
   **Summarize Conversation** to bootstrap a long chat.
3. The result appears on the right with the new token count and the
   percentage of the original size.

![Web UI — summarize conversation](../screenshots/summarize%20convo.png)

That is the entire interface. Pick a function, paste, click, copy.

## API endpoints

The same server exposes the underlying API directly. The Chrome extension
hits these as well — anything you can do in the UI you can do over HTTP.

### `POST /api/shorten`

Request:

```json
{ "text": "<your long prompt>" }
```

Response:

```json
{
  "originalTokens": 5144,
  "optimizedTokens": 132,
  "optimizedText": "**Issue:** Endpoint not responding. ...",
  "cost": 0.001162,
  "verification": null
}
```

If you pass `"verify": true` in the body, the server runs the strong model
on the compressed text and returns the answer in the `verification` field
(at additional cost).

### `POST /api/summarize`

Request:

```json
{ "text": "<full conversation transcript>" }
```

Response:

```json
{
  "originalTokens": 4768,
  "optimizedTokens": 370,
  "summaryText": "**Bootstrap Summary:** ...",
  "cost": 0.001061
}
```

### Quick `curl` test

```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"text":"please tell me, in great detail, what 2+2 is"}'
```

## Configuration

The default port is `3000`. Override with `PORT=4000 npm start` if needed.
The Chrome extension expects the server at `http://localhost:3000`, so if
you change the port you will need to update the extension as well.

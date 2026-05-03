# Technical Abstract

**Project:** COP-X — Prompt Optimizer
**Team:** Green Lantern (Mahdi Ben Slima · Zied Koubaa · Amine Mseddi · Hedi Moalla)

## Problem

Modern Large Language Models charge per token on both input and output. In real
engineering use, two patterns drive most of the cost:

1. **Bloated single prompts** — users paste verbose specifications, full log
   files, and copy-pasted boilerplate alongside a simple question. The
   instruction is short; the noise is enormous.
2. **Long-running conversations** — every follow-up message replays the entire
   prior history through the model. Cost per turn grows linearly with chat
   length, and after a few dozen exchanges the same conversation costs an
   order of magnitude more than it did at the start.

Both patterns are paid in full by the user, even though most of the tokens
carry no new information.

## Approach

COP-X applies a two-tier model strategy. A cheap, fast model (`gpt-4o-mini`)
is used as a preprocessor to rewrite or summarize the user's input. The
expensive reasoning model is then invoked — if at all — on a much smaller
payload. Because the cheap model is roughly 16× less expensive per input
token than the strong one, paying for a preprocessing pass is profitable
whenever it removes more than ~6% of the original token count. In practice
it removes 90%+.

Two functions are exposed:

- **`shorten(text)`** compresses a single verbose prompt into the minimal
  technical instruction that produces the same downstream answer.
- **`summarize(text)`** condenses a full conversation transcript into a
  *Bootstrap Summary* — a structured snapshot of problem, environment,
  attempted solutions, and next step — so the user can paste it into a fresh
  chat and continue without paying to replay history.

## Implementation

The optimization logic lives in a single core module ([`lib.js`](../lib.js))
that wraps the OpenAI Chat Completions API. Three independent surfaces consume
this core:

- **CLI** ([`cli.js`](../cli.js)) — file or stdin input, scriptable, supports
  optional verification with the strong model.
- **Web UI** ([`server.js`](../server.js) + [`public/`](../public)) — Express
  server exposing `/api/shorten` and `/api/summarize`, with a single-page
  dashboard.
- **Chrome extension** ([`promptify-extension/`](../promptify-extension)) —
  injects directly into ChatGPT, monitors live word counts, and replaces the
  user's prompt in place when they click *Optimize*.

All three surfaces hit the same backend endpoints, so behavior stays
consistent across entry points.

## Results

Measured on representative inputs included in the repository:

| Function    | Input tokens | Output tokens | Reduction | Optimization cost |
| ----------- | -----------: | ------------: | --------: | ----------------: |
| `shorten`   |        5,144 |           132 |    97.4 % |        $0.001162 |
| `summarize` |        4,768 |           370 |    92.2 % |        $0.001061 |

The compressed `shorten` output produces the same diagnostic answer when fed
to the strong model — verified end-to-end by `npm run test-batch`. The
`summarize` output preserves environment state, prior attempts, and the
user's exact next step, so a fresh chat can resume without context loss.

## Conclusion

Prompt-side preprocessing with a cheaper model is a clean, measurable win
for any LLM workload that is bottlenecked on input tokens. COP-X packages
this idea as a reusable backend with three deployable frontends, and the
Chrome extension brings the savings inline to the most common consumer
surface (ChatGPT) without changing the user's workflow.

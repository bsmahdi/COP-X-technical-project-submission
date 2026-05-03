# The Problem

LLM usage is billed per token. Costs do not depend on the *quality* of the
input — only on its size. This creates two persistent waste patterns that
hit every team using LLMs in production.

## 1. Bloated one-shot prompts

When a developer asks a model to investigate an issue, they typically paste:

- the question (1–2 lines),
- a complete log dump (hundreds of lines),
- environment details, container output, stack traces,
- and several paragraphs of context the model does not need.

The actual *instruction* is a small fraction of what gets billed. The model
ignores the noise; the user pays for it anyway. Worse, the strong models
(`gpt-4o`, `gpt-5.5`, etc.) are billed at a premium rate per input token,
so this fluff is paid at the most expensive tier in the catalog.

## 2. Conversation context bloat

Chat-style products replay the full history on every turn. After 20 messages
each new question is shipped to the API alongside ~20 earlier questions and
20 earlier answers. The cost per turn climbs steadily, and the user has no
direct lever to push back on it. Common workarounds — start a new chat,
manually retype the relevant context — destroy the implicit state that
made the conversation useful in the first place.

## Why this matters

For a single user, a few cents per query is invisible. For a team with
many engineers using LLMs daily, or for any product that wraps an LLM
behind its own UI, these wasted tokens are a real, recurring line item:

- Predictable, repeated overhead on every interaction.
- Latency penalty proportional to input size.
- Hidden ceiling on how long a useful conversation can run before it
  becomes uneconomic to continue.

## What we wanted

A drop-in optimizer that:

- runs *before* the expensive call,
- uses a cheaper model to do the cleanup,
- preserves enough technical fidelity that the strong model still answers
  correctly,
- and exposes itself through the surfaces people actually use — terminal,
  browser, and ChatGPT itself.

That is COP-X. See [`ABSTRACT.md`](./ABSTRACT.md) for the approach and
[`ARCHITECTURE.md`](./ARCHITECTURE.md) for how it is built.

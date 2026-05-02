# Prompt Compression Proof of Concept

This Node.js application demonstrates how to use a cheaper LLM to compress long prompts before sending them to a more expensive, high-quality model. This can significantly reduce costs while maintaining the quality of the final output.

## Features

- **Prompt Compression**: Automatically uses a cheap model (e.g., `gpt-4o-mini`) to summarize and streamline long user prompts.
- **Cost Estimation**: Calculates and compares the cost of running the original prompt vs. the compressed pipeline.
- **Smart Skipping**: Skips compression for short prompts (below 800 estimated tokens) or if the compression ratio is not significant (above 75%).
- **Terminal Statistics**: Provides clear metrics on token counts, compression ratio, and estimated savings.

## Prerequisites

- Node.js (v18 or higher recommended)
- OpenAI API Key

## Setup

1. Clone the repository or copy the files.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your environment:
   Create a `.env` file in the root directory (you can use `.env.example` as a template):
   ```env
   OPENAI_API_KEY=your_actual_api_key_here
   CHEAP_MODEL=gpt-4o-mini
   EXPENSIVE_MODEL=gpt-4o
   ```

## Usage

Run the script using:
```bash
node index.js
```

The script will:
1. Load a long sample prompt.
2. Estimate the token count.
3. Attempt to compress the prompt using the cheap model.
4. Execute the final task using the expensive model with the (possibly compressed) prompt.
5. Print the results and savings to the terminal.

## Configuration

You can customize the models and their associated costs in the `.env` file. If costs are not provided, the application uses default estimates.

Costs are defined as "per 1 million tokens":
- `CHEAP_MODEL_INPUT_COST_PER_1M`
- `CHEAP_MODEL_OUTPUT_COST_PER_1M`
- `EXPENSIVE_MODEL_INPUT_COST_PER_1M`
- `EXPENSIVE_MODEL_OUTPUT_COST_PER_1M`

## Token Estimation

Tokens are estimated using a rough heuristic: `tokens ≈ Math.ceil(text.length / 4)`. This provides a quick, local estimation without needing a tokenizer library.

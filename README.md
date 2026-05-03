# COP-X: AI Prompt Optimizer

A modular proof-of-concept for **Prompt Compression** and **Conversation Summarization** to reduce LLM costs while preserving technical fidelity.

## Architecture
- **Core Library (`lib.js`)**: Powers all optimization logic.
- **CLI Tool (`cli.js`)**: For local file processing and pipe-based workflows.
- **Web UI (`server.js` + `public/`)**: A modern web interface for manual optimization.

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Create a `.env` file (see `.env.example`):
   ```env
   OPENAI_API_KEY=your_key_here
   ```

## Usage

### 1. Web Interface (Recommended)
Launch the interactive dashboard:
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. CLI Tool
You can process files or text directly from the terminal.

**Shorten a prompt**:
```bash
node cli.js shorten "./prompt examples/prompts/prompt example.txt"
```

**Summarize a conversation**:
```bash
node cli.js summarize "./prompt examples/convos/convo example.txt"
```

**Advanced CLI Flags**:
- `-o, --output <path>`: Save result to a file.
- `-v, --verify`: Run the expensive model (GPT-4o) to see the final answer.
- `-s, --silent`: Output only the result text (great for scripts).

### 3. Batch Testing
Process all files in the `prompt examples/` directory:
```bash
npm run test-batch
```

## How it Works
1. **Shorten**: Uses a "cheap" model (GPT-4o-mini) to strip fluff and compress instructions into technical shorthand.
2. **Summarize**: Creates a "Context Bootstrap" summary of long chat histories, preserving problem state and next steps.
3. **Verify**: Optionally runs the optimized input through a "strong" model (GPT-4o) to confirm output quality.

## Cost Estimation
The tool calculates savings based on current OpenAI pricing for input and output tokens. Optimization typically yields **50% - 90%** token reduction.

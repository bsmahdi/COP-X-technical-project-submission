import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CHEAP_MODEL = process.env.CHEAP_MODEL || 'gpt-4o-mini';
const EXPENSIVE_MODEL = process.env.EXPENSIVE_MODEL || 'gpt-4o';

// Cost estimates (per 1M tokens)
const CHEAP_INPUT_COST = parseFloat(process.env.CHEAP_MODEL_INPUT_COST_PER_1M) || 0.25;
const CHEAP_OUTPUT_COST = parseFloat(process.env.CHEAP_MODEL_OUTPUT_COST_PER_1M) || 2.00;
const EXPENSIVE_INPUT_COST = parseFloat(process.env.EXPENSIVE_MODEL_INPUT_COST_PER_1M) || 1.25;
const EXPENSIVE_OUTPUT_COST = parseFloat(process.env.EXPENSIVE_MODEL_OUTPUT_COST_PER_1M) || 10.00;

if (!OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is missing in .env file.');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Roughly estimate the number of tokens in a text.
 * tokens ≈ Math.ceil(text.length / 4)
 */
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate the cost of an LLM call.
 */
function calculateCost(inputTokens, outputTokens, inputCostPer1M, outputCostPer1M) {
  return (inputTokens / 1_000_000 * inputCostPer1M) + (outputTokens / 1_000_000 * outputCostPer1M);
}

/**
 * Use the cheap model to compress the prompt.
 */
async function compressPrompt(prompt) {
  const compressionSystemPrompt = `You are a prompt compression engine.

Compress the user's prompt while preserving:
- main task
- critical constraints
- required context
- exact technical details
- names, paths, commands, versions, dates, URLs, numbers
- required output format

Remove:
- repetition
- filler
- unnecessary politeness
- redundant role instructions
- duplicated constraints
- verbose explanations

Return only the compressed prompt.`;

  try {
    const response = await openai.chat.completions.create({
      model: CHEAP_MODEL,
      messages: [
        { role: 'system', content: compressionSystemPrompt },
        { role: 'user', content: `Original prompt:\n${prompt}` }
      ],
      temperature: 0,
    });

    const compressedPrompt = response.choices[0].message.content.trim();
    const inputTokens = response.usage.prompt_tokens;
    const outputTokens = response.usage.completion_tokens;
    const cost = calculateCost(inputTokens, outputTokens, CHEAP_INPUT_COST, CHEAP_OUTPUT_COST);

    return { compressedPrompt, cost, inputTokens, outputTokens };
  } catch (error) {
    console.error('Compression failed:', error.message);
    return null;
  }
}

/**
 * Use the expensive model to run the final task.
 */
async function runMainTask(prompt) {
  try {
    const response = await openai.chat.completions.create({
      model: EXPENSIVE_MODEL,
      messages: [{ role: 'user', content: prompt }],
    });

    const answer = response.choices[0].message.content;
    const inputTokens = response.usage.prompt_tokens;
    const outputTokens = response.usage.completion_tokens;
    const cost = calculateCost(inputTokens, outputTokens, EXPENSIVE_INPUT_COST, EXPENSIVE_OUTPUT_COST);

    return { answer, cost, inputTokens, outputTokens };
  } catch (error) {
    console.error('Main task execution failed:', error.message);
    return null;
  }
}

async function main() {
  const inputPath = path.join(process.cwd(), 'prompt examples', 'prompt example.txt');
  const outputDir = path.join(process.cwd(), 'output');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found at ${inputPath}`);
    process.exit(1);
  }

  console.log(`Reading prompt from: ${inputPath}`);
  const samplePrompt = fs.readFileSync(inputPath, 'utf8');

  const originalTokens = estimateTokens(samplePrompt);
  console.log('\n--- Prompt Compression POC ---');
  console.log(`Original estimated tokens: ${originalTokens}`);

  let finalPrompt = samplePrompt;
  let compressionUsed = false;
  let pipelineCost = 0;
  let compressionStats = null;

  if (originalTokens >= 800) {
    console.log('Prompt length >= 800 tokens. Attempting compression...');
    compressionStats = await compressPrompt(samplePrompt);

    if (compressionStats) {
      const compressedTokens = estimateTokens(compressionStats.compressedPrompt);
      const ratio = compressedTokens / originalTokens;

      console.log(`Compressed estimated tokens: ${compressedTokens}`);
      console.log(`Compression ratio: ${(ratio * 100).toFixed(2)}%`);

      if (ratio <= 0.75) {
        console.log('Compression successful (<= 75%). Using compressed prompt.');
        finalPrompt = compressionStats.compressedPrompt;
        compressionUsed = true;
        pipelineCost += compressionStats.cost;
      } else {
        console.log('Compression ratio > 75%. Discarding compressed prompt to maintain context quality.');
      }
    }
  } else {
    console.log('Prompt is short (< 800 tokens). Skipping compression.');
  }

  // Save prompts to files for inspection
  const originalOutputPath = path.join(outputDir, 'before_original_prompt.txt');
  const compressedOutputPath = path.join(outputDir, 'after_compressed_prompt.txt');

  fs.writeFileSync(originalOutputPath, samplePrompt);
  console.log(`\nOriginal prompt saved to: ${originalOutputPath}`);

  if (compressionUsed) {
    fs.writeFileSync(compressedOutputPath, finalPrompt);
    console.log(`Compressed prompt saved to: ${compressedOutputPath}`);
  } else {
    console.log('Compression was not used or failed; after_compressed_prompt.txt not created.');
  }

  console.log('\nRunning main task with expensive model...');
  const mainTaskResult = await runMainTask(finalPrompt);

  if (!mainTaskResult) {
    console.error('Failed to get a response from the expensive model.');
    return;
  }

  pipelineCost += mainTaskResult.cost;

  // Estimate cost if we had used the original prompt (assuming same output length)
  const originalInputCost = calculateCost(originalTokens, mainTaskResult.outputTokens, EXPENSIVE_INPUT_COST, EXPENSIVE_OUTPUT_COST);
  const savings = originalInputCost - pipelineCost;

  console.log('\n--- Final Stats ---');
  console.log(`Compression Used: ${compressionUsed ? 'YES' : 'NO'}`);
  console.log(`Original Expensive Model Cost (Est): $${originalInputCost.toFixed(6)}`);
  console.log(`Actual Pipeline Cost: $${pipelineCost.toFixed(6)}`);
  console.log(`Estimated Savings: $${savings.toFixed(6)} (${((savings / originalInputCost) * 100).toFixed(2)}%)`);

  console.log('\n--- Final Answer ---');
  console.log(mainTaskResult.answer);

  // Save the answer too
  const answerOutputPath = path.join(outputDir, 'final_answer.txt');
  fs.writeFileSync(answerOutputPath, mainTaskResult.answer);
  console.log(`\nFinal answer saved to: ${answerOutputPath}`);
}

main();


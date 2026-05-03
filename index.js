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
const CHEAP_INPUT_COST = parseFloat(process.env.CHEAP_MODEL_INPUT_COST_PER_1M) || 0.15;
const CHEAP_OUTPUT_COST = parseFloat(process.env.CHEAP_MODEL_OUTPUT_COST_PER_1M) || 0.60;
const EXPENSIVE_INPUT_COST = parseFloat(process.env.EXPENSIVE_MODEL_INPUT_COST_PER_1M) || 2.50;
const EXPENSIVE_OUTPUT_COST = parseFloat(process.env.EXPENSIVE_MODEL_OUTPUT_COST_PER_1M) || 10.00;

if (!OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is missing in .env file.');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Roughly estimate the number of tokens in a text.
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
 * Use the cheap model to compress the prompt or summarize the conversation.
 */
async function processInput(text, isConversation) {
  const systemPrompt = isConversation 
    ? `You are a conversation summarizer. 
Summarize the following conversation history into a concise "Context Bootstrap" prompt.
The goal is for a user to paste this summary into a NEW session so the AI knows exactly:
- The current problem being solved.
- The technical environment and constraints.
- What has already been tried or verified.
- The exact next steps or pending questions.
Maintain all critical technical details (DNs, paths, commands, IP addresses, error messages).
Return only the summary.`
    : `You are a prompt compression engine.
Compress the user's prompt while preserving:
- main task
- critical constraints
- required context
- exact technical details (names, paths, commands, versions, URLs)
- required output format
Remove repetition, filler, and verbosity. Return only the compressed prompt.`;

  try {
    const response = await openai.chat.completions.create({
      model: CHEAP_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${isConversation ? 'Conversation History' : 'Original Prompt'}:\n${text}` }
      ],
      temperature: 0,
    });

    const processedText = response.choices[0].message.content.trim();
    const inputTokens = response.usage.prompt_tokens;
    const outputTokens = response.usage.completion_tokens;
    const cost = calculateCost(inputTokens, outputTokens, CHEAP_INPUT_COST, CHEAP_OUTPUT_COST);

    return { processedText, cost, inputTokens, outputTokens };
  } catch (error) {
    console.error('Processing failed:', error.message);
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
  const baseInputDir = path.join(process.cwd(), 'prompt examples');
  const baseOutputDir = path.join(process.cwd(), 'output');

  const categories = [
    { name: 'prompts', isConversation: false, shouldRunExpensive: true },
    { name: 'convos', isConversation: true, shouldRunExpensive: false }
  ];

  console.log(`--- Prompt Compression & Conversation Summarization POC ---`);

  for (const category of categories) {
    const inputDir = path.join(baseInputDir, category.name);
    const outputDir = path.join(baseOutputDir, category.name);

    if (!fs.existsSync(inputDir)) continue;
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.txt'));
    if (files.length === 0) continue;

    console.log(`\nProcessing Category: ${category.name.toUpperCase()}`);
    console.log(`Found ${files.length} files.\n`);

    for (const file of files) {
      const inputPath = path.join(inputDir, file);
      const content = fs.readFileSync(inputPath, 'utf8');
      
      console.log(`File: ${file}`);
      
      const originalTokens = estimateTokens(content);
      console.log(`Original estimated tokens: ${originalTokens}`);

      let finalPrompt = content;
      let pipelineCost = 0;
      let compressionUsed = false;

      if (originalTokens >= 800) {
        console.log(`Triggering optimization...`);
        const stats = await processInput(content, category.isConversation);

        if (stats) {
          const processedTokens = estimateTokens(stats.processedText);
          const ratio = processedTokens / originalTokens;

          console.log(`Optimized estimated tokens: ${processedTokens} (Ratio: ${(ratio * 100).toFixed(2)}%)`);

          if (ratio <= 0.75) {
            console.log(`Optimization successful. Using optimized version.`);
            finalPrompt = stats.processedText;
            compressionUsed = true;
            pipelineCost += stats.cost;
          } else {
            console.log(`Ratio > 75%. Keeping original.`);
          }
        }
      } else {
        console.log(`File is small. Skipping optimization.`);
      }

      // Save results
      const baseName = path.basename(file, '.txt').replace(/\s+/g, '_');
      fs.writeFileSync(path.join(outputDir, `before_${baseName}.txt`), content);
      
      if (compressionUsed) {
        fs.writeFileSync(path.join(outputDir, `after_${baseName}.txt`), finalPrompt);
      }

      if (category.shouldRunExpensive) {
        console.log(`Running final verification with expensive model...`);
        const mainTaskResult = await runMainTask(finalPrompt);

        if (mainTaskResult) {
          pipelineCost += mainTaskResult.cost;
          fs.writeFileSync(path.join(outputDir, `answer_${baseName}.txt`), mainTaskResult.answer);
          
          const originalInputCost = calculateCost(originalTokens, mainTaskResult.outputTokens, EXPENSIVE_INPUT_COST, EXPENSIVE_OUTPUT_COST);
          const savings = originalInputCost - pipelineCost;
          
          console.log(`Savings for ${file}: $${savings.toFixed(6)} (${((savings / originalInputCost) * 100).toFixed(2)}%)\n`);
        }
      } else {
        console.log(`Skipping expensive model run for ${category.name} category.\n`);
      }
    }
  }

  console.log(`\nAll files processed. Check the 'output' directory for results.`);
}

main();
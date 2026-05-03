import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Model Constants
export const CHEAP_MODEL = process.env.CHEAP_MODEL || 'gpt-4o-mini';
export const EXPENSIVE_MODEL = process.env.EXPENSIVE_MODEL || 'gpt-4o';

// Cost Constants (Per 1M tokens)
export const CHEAP_INPUT_COST = parseFloat(process.env.CHEAP_INPUT_COST_PER_1M) || 0.15;
export const CHEAP_OUTPUT_COST = parseFloat(process.env.CHEAP_OUTPUT_COST_PER_1M) || 0.60;
export const EXPENSIVE_INPUT_COST = parseFloat(process.env.EXPENSIVE_INPUT_COST_PER_1M) || 2.50;
export const EXPENSIVE_OUTPUT_COST = parseFloat(process.env.EXPENSIVE_OUTPUT_COST_PER_1M) || 10.00;

export function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

export function calculateCost(inputTokens, outputTokens, inputRate, outputRate) {
  return (inputTokens / 1000000) * inputRate + (outputTokens / 1000000) * outputRate;
}

async function processWithModel(systemPrompt, userContent, model = CHEAP_MODEL) {
  const response = await openai.chat.completions.create({
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.3,
  });

  const cost = calculateCost(
    response.usage.prompt_tokens,
    response.usage.completion_tokens,
    model === CHEAP_MODEL ? CHEAP_INPUT_COST : EXPENSIVE_INPUT_COST,
    model === CHEAP_MODEL ? CHEAP_OUTPUT_COST : EXPENSIVE_OUTPUT_COST
  );

  return {
    text: response.choices[0].message.content,
    cost: cost,
    usage: response.usage
  };
}

export async function shorten(text) {
  const systemPrompt = `You are a prompt compression engine. 
  Your goal is to take a long, detailed prompt and compress it into a much shorter version that retains ALL critical instructions, variables, and technical context.
  - Remove fluff, greetings, and repetitive explanations.
  - Use concise technical shorthand.
  - Preserve specific values, error codes, and architectural requirements.
  - Ensure the resulting prompt would produce the exact same outcome when sent to a high-quality LLM.`;

  return await processWithModel(systemPrompt, text, CHEAP_MODEL);
}

export async function summarize(text) {
  const systemPrompt = `You are a Context Bootstrap Engine.
  You will be given a long conversation history between a User and an AI.
  Your task is to create a high-fidelity "Bootstrap Summary" that allows a fresh AI session to continue the conversation seamlessly.
  The summary MUST include:
  1. The core problem being solved.
  2. The current state of the environment (OS, versions, tech stack).
  3. What has been tried so far (and what failed).
  4. The exact next step the user was about to take.
  5. Any critical secrets or IDs mentioned (mask them if they look like real passwords, but keep structure).
  Be extremely concise but technically complete.`;

  return await processWithModel(systemPrompt, text, CHEAP_MODEL);
}

export async function verify(text, model = EXPENSIVE_MODEL) {
  const systemPrompt = "You are a helpful technical assistant. Answer the following request based on the provided context.";
  return await processWithModel(systemPrompt, text, model);
}

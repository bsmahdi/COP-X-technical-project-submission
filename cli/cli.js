#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { shorten, summarize, verify, estimateTokens } from '../backend/lib.js';

const program = new Command();

program
  .name('cop-x')
  .description('CLI for Prompt Compression & Conversation Summarization')
  .version('1.0.0');

program
  .command('shorten')
  .description('Compress a long prompt into a concise version')
  .argument('<input>', 'File path or raw text')
  .option('-o, --output <path>', 'Save the result to a file')
  .option('-v, --verify', 'Run the expensive model verification after shortening')
  .option('-s, --silent', 'Only output the result text')
  .action(async (input, options) => {
    try {
      const content = fs.existsSync(input) ? fs.readFileSync(input, 'utf8') : input;
      const originalTokens = estimateTokens(content);
      
      if (!options.silent) {
        console.log(`--- Prompt Compression ---`);
        console.log(`Original tokens: ${originalTokens}`);
        console.log(`Processing...`);
      }

      const result = await shorten(content);
      const optimizedTokens = estimateTokens(result.text);

      if (options.output) {
        fs.writeFileSync(options.output, result.text);
      }

      if (options.silent) {
        process.stdout.write(result.text);
      } else {
        console.log(`\nOptimized Prompt:\n-----------------\n${result.text}\n-----------------`);
        console.log(`Optimized tokens: ${optimizedTokens} (${((optimizedTokens / originalTokens) * 100).toFixed(2)}%)`);
        console.log(`Optimization cost: $${result.cost.toFixed(6)}`);

        if (options.verify) {
          console.log(`\nRunning verification with expensive model...`);
          const verification = await verify(result.text);
          console.log(`\nResponse:\n---------\n${verification.text}\n---------`);
          console.log(`Verification cost: $${verification.cost.toFixed(6)}`);
        }
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
    }
  });

program
  .command('summarize')
  .description('Create a high-fidelity summary of a conversation history')
  .argument('<input>', 'File path or raw text')
  .option('-o, --output <path>', 'Save the result to a file')
  .option('-s, --silent', 'Only output the result text')
  .action(async (input, options) => {
    try {
      const content = fs.existsSync(input) ? fs.readFileSync(input, 'utf8') : input;
      const originalTokens = estimateTokens(content);

      if (!options.silent) {
        console.log(`--- Conversation Summarization ---`);
        console.log(`Original tokens: ${originalTokens}`);
        console.log(`Processing...`);
      }

      const result = await summarize(content);
      const optimizedTokens = estimateTokens(result.text);

      if (options.output) {
        fs.writeFileSync(options.output, result.text);
      }

      if (options.silent) {
        process.stdout.write(result.text);
      } else {
        console.log(`\nBootstrap Summary:\n------------------\n${result.text}\n------------------`);
        console.log(`Summary tokens: ${optimizedTokens} (${((optimizedTokens / originalTokens) * 100).toFixed(2)}%)`);
        console.log(`Cost: $${result.cost.toFixed(6)}`);
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
    }
  });

program.parse();

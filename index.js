import fs from 'fs';
import path from 'path';
import { shorten, summarize, verify, estimateTokens, calculateCost, EXPENSIVE_INPUT_COST, EXPENSIVE_OUTPUT_COST } from './lib.js';

async function main() {
  const baseInputDir = path.join(process.cwd(), 'prompt examples');
  const baseOutputDir = path.join(process.cwd(), 'output');

  const categories = [
    { name: 'prompts', isConversation: false, shouldRunExpensive: true },
    { name: 'convos', isConversation: true, shouldRunExpensive: false }
  ];

  console.log(`--- COP-X Batch Processing POC ---`);

  for (const category of categories) {
    const inputDir = path.join(baseInputDir, category.name);
    const outputDir = path.join(baseOutputDir, category.name);

    if (!fs.existsSync(inputDir)) continue;
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.txt'));
    if (files.length === 0) continue;

    console.log(`\nCategory: ${category.name.toUpperCase()}`);

    for (const file of files) {
      const content = fs.readFileSync(path.join(inputDir, file), 'utf8');
      console.log(`File: ${file}`);
      
      const originalTokens = estimateTokens(content);
      const result = category.isConversation ? await summarize(content) : await shorten(content);
      const optimizedTokens = estimateTokens(result.text);

      console.log(`- Original: ${originalTokens} tokens`);
      console.log(`- Optimized: ${optimizedTokens} tokens (${((optimizedTokens / originalTokens) * 100).toFixed(1)}%)`);

      const baseName = path.basename(file, '.txt').replace(/\s+/g, '_');
      fs.writeFileSync(path.join(outputDir, `before_${baseName}.txt`), content);
      fs.writeFileSync(path.join(outputDir, `after_${baseName}.txt`), result.text);

      if (category.shouldRunExpensive) {
        console.log(`- Running verification...`);
        const verification = await verify(result.text);
        fs.writeFileSync(path.join(outputDir, `answer_${baseName}.txt`), verification.text);
        
        const originalCost = calculateCost(originalTokens, verification.usage.completion_tokens, EXPENSIVE_INPUT_COST, EXPENSIVE_OUTPUT_COST);
        const pipelineCost = result.cost + verification.cost;
        const savings = originalCost - pipelineCost;
        
        console.log(`- Savings: $${savings.toFixed(6)} (${((savings / originalCost) * 100).toFixed(2)}%)`);
      }
      console.log('');
    }
  }
}

main();
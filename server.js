import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { shorten, summarize, verify, estimateTokens } from './lib.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/shorten', async (req, res) => {
  const { text, verify: shouldVerify } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  try {
    const originalTokens = estimateTokens(text);
    const result = await shorten(text);
    const optimizedTokens = estimateTokens(result.text);

    let verification = null;
    if (shouldVerify) {
      verification = await verify(result.text);
    }

    res.json({
      originalTokens,
      optimizedTokens,
      optimizedText: result.text,
      cost: result.cost,
      verification: verification ? {
        text: verification.text,
        cost: verification.cost
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/summarize', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  try {
    const originalTokens = estimateTokens(text);
    const result = await summarize(text);
    const optimizedTokens = estimateTokens(result.text);

    res.json({
      originalTokens,
      optimizedTokens,
      summaryText: result.text,
      cost: result.cost
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

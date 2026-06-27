import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT ?? 3001);

const LLM_BASE_URL = process.env.LLM_BASE_URL ?? 'https://open.bigmodel.cn/api/paas/v4';
const LLM_API_KEY = process.env.LLM_API_KEY ?? '';
const LLM_MODEL = process.env.LLM_MODEL ?? 'glm-4-flash';
const LLM_PROVIDER = process.env.LLM_PROVIDER ?? 'Zhipu';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEEDS_DIR = process.env.SEEDS_DIR
  ? path.resolve(process.env.SEEDS_DIR)
  : path.resolve(__dirname, '..', '..', '..', 'seeds');

interface GenerateBody {
  systemPrompt?: string;
  userPrompt?: string;
  temperature?: number;
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    provider: LLM_PROVIDER,
    model: LLM_MODEL,
    keyConfigured: Boolean(LLM_API_KEY),
  });
});

app.post('/api/generate', async (req: Request, res: Response) => {
  const { systemPrompt, userPrompt, temperature } = req.body as GenerateBody;

  if (!userPrompt || typeof userPrompt !== 'string') {
    res.status(400).json({ error: 'userPrompt is required' });
    return;
  }
  if (!LLM_API_KEY) {
    res.status(500).json({
      error: 'LLM_API_KEY 未配置。请在 .env 写入。智谱 GLM-4-Flash 免费 key 可在 https://bigmodel.cn 申请。',
    });
    return;
  }

  try {
    const upstream = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: userPrompt },
        ],
        temperature: temperature ?? 0.85,
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      res.status(upstream.status).json({ error: `Upstream ${upstream.status}: ${text}` });
      return;
    }

    const data = (await upstream.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim() ?? '';
    res.json({
      content,
      modelInfo: { provider: LLM_PROVIDER, model: LLM_MODEL },
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.get('/api/seeds', async (_req: Request, res: Response) => {
  try {
    const entries = await fs.readdir(SEEDS_DIR);
    const bundles: { name: string; family: string; seeds: unknown[] }[] = [];
    for (const f of entries.sort()) {
      if (!f.endsWith('.seeds.json')) continue;
      const name = f.replace(/\.seeds\.json$/, '');
      const raw = await fs.readFile(path.join(SEEDS_DIR, f), 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.seeds)) {
        const family = typeof parsed.family === 'string' && parsed.family ? parsed.family : name;
        bundles.push({ name, family, seeds: parsed.seeds });
      }
    }
    res.json({ seedsDir: SEEDS_DIR, bundles });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      res.json({ seedsDir: SEEDS_DIR, bundles: [] });
      return;
    }
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
  console.log(`[api] provider=${LLM_PROVIDER} model=${LLM_MODEL} keyConfigured=${Boolean(LLM_API_KEY)}`);
});

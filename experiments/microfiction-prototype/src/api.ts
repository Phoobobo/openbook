import type { ModelInfo } from './types';
import { getLlmConfig } from './store/llmConfig';
import { DEMO_SAMPLE } from './demoSample';

export interface GenerateRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

export interface GenerateResponse {
  content: string;
  modelInfo: ModelInfo;
}

// 三种运行形态，按优先级：
// 1. 访客填了自己的 key → 浏览器直连 OpenAI 兼容接口（静态部署也能真实生成）
// 2. 本地 dev 未填 key → 走 Express 后端 /api/generate（用 .env 里的 key）
// 3. 静态部署未填 key → 演示模式，返回预置样例
export async function generate(req: GenerateRequest): Promise<GenerateResponse> {
  const cfg = getLlmConfig();
  if (cfg.apiKey) return generateDirect(req, cfg);
  if (import.meta.env.DEV) return generateViaBackend(req);
  return generateDemo();
}

async function generateDirect(
  req: GenerateRequest,
  cfg: { apiKey: string; baseUrl: string; model: string },
): Promise<GenerateResponse> {
  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: req.userPrompt },
      ],
      temperature: req.temperature ?? 0.85,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`生成失败 (${res.status})：${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content?.trim() ?? '';
  if (!content) throw new Error('模型返回了空内容，换个提示词再试一次');
  return { content, modelInfo: { provider: '自带 key', model: cfg.model } };
}

async function generateViaBackend(req: GenerateRequest): Promise<GenerateResponse> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`生成失败 (${res.status}): ${text}`);
  }
  return (await res.json()) as GenerateResponse;
}

async function generateDemo(): Promise<GenerateResponse> {
  await new Promise((r) => setTimeout(r, 1200));
  return {
    content: DEMO_SAMPLE,
    modelInfo: { provider: '演示模式', model: '预置样例 · 未调用真实模型' },
  };
}

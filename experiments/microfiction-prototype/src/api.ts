import type { ModelInfo } from './types';

export interface GenerateRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

export interface GenerateResponse {
  content: string;
  modelInfo: ModelInfo;
}

export async function generate(req: GenerateRequest): Promise<GenerateResponse> {
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

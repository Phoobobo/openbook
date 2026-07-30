export interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const STORAGE_KEY = 'openbook.llm.config.v1';

export const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
export const DEFAULT_MODEL = 'google/gemma-4-31b-it:free';

// 访客自带 key：只存在本人浏览器 localStorage，不上传任何服务器。
export function getLlmConfig(): LlmConfig {
  const empty: LlmConfig = { apiKey: '', baseUrl: DEFAULT_BASE_URL, model: DEFAULT_MODEL };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<LlmConfig>;
    return {
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey.trim() : '',
      baseUrl: parsed.baseUrl?.trim() || DEFAULT_BASE_URL,
      model: parsed.model?.trim() || DEFAULT_MODEL,
    };
  } catch {
    return empty;
  }
}

export function setLlmConfig(cfg: LlmConfig) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      apiKey: cfg.apiKey.trim(),
      baseUrl: cfg.baseUrl.trim() || DEFAULT_BASE_URL,
      model: cfg.model.trim() || DEFAULT_MODEL,
    }),
  );
}

export function clearLlmConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

import type { BranchOption, ModelInfo } from '../types';
import { storiesStore } from './storage';

interface PresetStory {
  id: string;
  title: string;
  family?: string;
  content: string;
  bgm?: string;
  seedIds: string[];
  prompt: string;
  modelInfo: ModelInfo;
  branches: BranchOption[];
}

// 静态预置故事，构建时由 scripts/gen-preset-stories.mjs 从仓库 stories/ 生成
export async function fetchPresetStories(): Promise<PresetStory[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}stories.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { stories?: PresetStory[] };
  return data.stories ?? [];
}

// 按顺序写入。storiesStore.upsert 是 unshift，而阅读端读的是 reverse，
// 所以写入顺序 = 阅读顺序；访客之后自己生成的会排在预置故事后面。
export function importPresetStories(presets: PresetStory[]): number {
  const existing = new Set(storiesStore.list().map((s) => s.id));
  let added = 0;
  const now = Date.now();

  presets.forEach((p, i) => {
    if (existing.has(p.id)) return;
    storiesStore.upsert({
      ...p,
      // bgm 在 JSON 里是相对路径，这里拼上部署 base，子路径部署才不会 404
      bgm: p.bgm ? `${import.meta.env.BASE_URL}${p.bgm}` : '',
      createdAt: now + i,
      updatedAt: now + i,
    });
    added++;
  });

  return added;
}

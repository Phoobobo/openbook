import type { SeedType } from '../types';
import { seedsStore, newId } from './storage';

export interface SeedBundle {
  name: string;
  family: string;
  seeds: { type: SeedType; title: string; content: string }[];
}

export interface ImportResult {
  added: number;
  skipped: number;
}

// 静态种子包，构建时由 scripts/gen-static-seeds.mjs 从仓库 seeds/ 生成
export async function fetchSeedBundles(): Promise<SeedBundle[]> {
  const res = await fetch(`${import.meta.env.BASE_URL}seeds.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { bundles?: SeedBundle[] };
  return data.bundles ?? [];
}

// 按 family|type|title 去重写入，返回新增 / 跳过条数
export function importBundles(bundles: SeedBundle[]): ImportResult {
  const flat = bundles.flatMap((b) => b.seeds.map((s) => ({ ...s, family: b.family })));
  const existing = new Set(seedsStore.list().map((s) => `${s.family}|${s.type}|${s.title}`));
  let added = 0;
  let skipped = 0;
  const now = Date.now();

  for (let i = 0; i < flat.length; i++) {
    const seed = flat[i];
    const key = `${seed.family}|${seed.type}|${seed.title}`;
    if (existing.has(key)) {
      skipped++;
      continue;
    }
    seedsStore.upsert({
      id: newId(),
      family: seed.family,
      type: seed.type,
      title: seed.title,
      content: seed.content,
      createdAt: now + i,
    });
    existing.add(key);
    added++;
  }

  return { added, skipped };
}

export async function importSeedsFromStatic(): Promise<ImportResult> {
  return importBundles(await fetchSeedBundles());
}

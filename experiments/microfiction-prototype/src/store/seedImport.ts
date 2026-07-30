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

const BOOTSTRAP_FLAG = 'openbook.seeds.bootstrapped.v1';

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

let inFlight: Promise<boolean> | null = null;

// 首次访问自动带好种子，省掉演示时先点「导入种子」那一步。
// 只在种子库为空且从未引导过时执行——一次性标记避免覆盖用户主动清空的意图。
export function bootstrapSeedsOnce(): Promise<boolean> {
  // 去重并发调用（React StrictMode 会重复触发 effect）
  if (!inFlight) inFlight = runBootstrap();
  return inFlight;
}

async function runBootstrap(): Promise<boolean> {
  try {
    if (localStorage.getItem(BOOTSTRAP_FLAG)) return false;
    if (seedsStore.list().length > 0) {
      localStorage.setItem(BOOTSTRAP_FLAG, '1');
      return false;
    }
    const { added } = await importSeedsFromStatic();
    localStorage.setItem(BOOTSTRAP_FLAG, '1');
    return added > 0;
  } catch {
    // 引导失败不打断页面，用户仍可手动点「导入种子」
    return false;
  }
}

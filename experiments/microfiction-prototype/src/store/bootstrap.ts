import { seedsStore, storiesStore } from './storage';
import { fetchSeedBundles, importBundles } from './seedImport';
import { fetchPresetStories, importPresetStories } from './storyPresets';

export interface BootstrapResult {
  seeds: number;
  stories: number;
}

// v2 起同时预置故事库；v1 只预置了种子，老访客会在这一版补上故事
const FLAG = 'openbook.demo.bootstrapped.v2';

let inFlight: Promise<BootstrapResult> | null = null;

// 首次访问自动带好种子库和故事库，让创作 / 阅读两个 tab 打开就有东西可看。
// 只在对应库为空且从未引导过时执行——一次性标记避免覆盖用户主动清空的意图。
export function bootstrapDemoDataOnce(): Promise<BootstrapResult> {
  // 去重并发调用（两个页面都会触发，StrictMode 还会重复触发 effect）
  if (!inFlight) inFlight = run();
  return inFlight;
}

async function run(): Promise<BootstrapResult> {
  const result: BootstrapResult = { seeds: 0, stories: 0 };
  if (localStorage.getItem(FLAG)) return result;

  let ok = true;

  try {
    if (seedsStore.list().length === 0) {
      result.seeds = importBundles(await fetchSeedBundles()).added;
    }
  } catch {
    ok = false; // 失败不打断页面，用户仍可手动点「导入种子」
  }

  try {
    if (storiesStore.list().length === 0) {
      result.stories = importPresetStories(await fetchPresetStories());
    }
  } catch {
    ok = false;
  }

  // 只有都没出错才落标记，避免一次网络抖动就永久跳过引导
  if (ok) localStorage.setItem(FLAG, '1');
  return result;
}

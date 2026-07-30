import type { Seed, SeedType } from '../types';
import type { SeedBundle } from './seedImport';

// 导出 / 导入用的仓库文件格式：与 seeds/*.seeds.json 完全一致，
// 导出的文件可以直接放进仓库 seeds/ 目录，进入共享种子库。
interface SeedFile {
  family: string;
  seeds: { type: SeedType; title: string; content: string }[];
}

// family 多为中文（如「北京 · 都市群像」），保留原字，只清掉文件名非法字符
// 和分隔符，结果确定可读：北京-都市群像
function slugify(family: string): string {
  const cleaned = family
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/[\s·・.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'seeds';
}

// 按 family 分组，一族一个文件——和仓库里的组织方式对齐
export function buildSeedFiles(seeds: Seed[]): { filename: string; json: string }[] {
  const byFamily = new Map<string, Seed[]>();
  for (const s of seeds) {
    const list = byFamily.get(s.family);
    if (list) list.push(s);
    else byFamily.set(s.family, [s]);
  }

  return Array.from(byFamily.entries()).map(([family, list]) => {
    const file: SeedFile = {
      family,
      seeds: list
        .slice()
        .sort((a, b) => a.createdAt - b.createdAt)
        .map(({ type, title, content }) => ({ type, title, content })),
    };
    return { filename: `${slugify(family)}.seeds.json`, json: JSON.stringify(file, null, 2) };
  });
}

export function downloadFile(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 交给浏览器发起下载后再回收
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 读入的文件既可能是单族的 {family, seeds}，也可能是打包的 {bundles:[...]}
export function parseSeedFile(text: string): SeedBundle[] {
  const data = JSON.parse(text) as unknown;
  if (!data || typeof data !== 'object') throw new Error('不是有效的 JSON 对象');

  const asBundles = (data as { bundles?: unknown }).bundles;
  if (Array.isArray(asBundles)) {
    return asBundles.filter(isBundle);
  }

  if (isBundle(data)) {
    const b = data as SeedFile;
    return [{ name: slugify(b.family), family: b.family, seeds: b.seeds }];
  }

  throw new Error('缺少 family / seeds 字段');
}

function isBundle(v: unknown): v is SeedBundle {
  if (!v || typeof v !== 'object') return false;
  const o = v as { family?: unknown; seeds?: unknown };
  return typeof o.family === 'string' && Array.isArray(o.seeds);
}

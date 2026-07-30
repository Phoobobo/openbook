// 把仓库 seeds/*.seeds.json 打包成一个静态 public/seeds.json，
// 让创作端在无后端的静态部署下也能"导入种子库"。
// 输出结构与原 /api/seeds 一致：{ bundles: [{ name, family, seeds }] }
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SEEDS_DIR = path.resolve(here, '..', '..', '..', 'seeds');
const OUT_FILE = path.resolve(here, '..', 'public', 'seeds.json');

const entries = (await readdir(SEEDS_DIR)).filter((f) => f.endsWith('.seeds.json')).sort();
const bundles = [];

for (const file of entries) {
  const parsed = JSON.parse(await readFile(path.join(SEEDS_DIR, file), 'utf8'));
  if (!parsed || !Array.isArray(parsed.seeds)) continue;
  const name = file.replace(/\.seeds\.json$/, '');
  bundles.push({ name, family: parsed.family || name, seeds: parsed.seeds });
}

await mkdir(path.dirname(OUT_FILE), { recursive: true });
await writeFile(OUT_FILE, JSON.stringify({ bundles }, null, 2));

const total = bundles.reduce((n, b) => n + b.seeds.length, 0);
console.log(`[seeds] ${bundles.length} bundle(s), ${total} seed(s) -> public/seeds.json`);

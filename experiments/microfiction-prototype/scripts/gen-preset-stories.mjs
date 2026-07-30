// 把 stories/*.md 打包成静态 public/stories.json，供阅读端首访预置。
// 故事正文的唯一来源仍是仓库 stories/，这里只做提取 + 分支串联。
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const STORIES_DIR = path.resolve(here, '..', '..', '..', 'stories');
const OUT_FILE = path.resolve(here, '..', 'public', 'stories.json');

// 预置进阅读端的故事 + 篇末分支（互为下一篇，任一入口都能演示"读完选下一篇"）
const PRESETS = [
  {
    file: 'qinian-mei-ren-tongzhi-wo.md',
    modelInfo: { provider: 'OpenBook', model: '示例作品' },
    bgm: 'bgm/rain-loop.mp3', // 相对路径，运行时用 BASE_URL 拼成部署子路径
    prompt: '示例作品 · 由 seeds/beijing 的《重逢》情节 + 30+ 都市白领人设加工',
    branches: [{ label: '换一个人的一周 —— 她把猫托给了楼上的邻居', to: 'niangao-de-fangdong' }],
  },
  {
    file: 'niangao-de-fangdong.md',
    modelInfo: { provider: 'OpenBook', model: '示例作品' },
    bgm: '',
    prompt: '示例作品 · 由 seeds/beijing 的《年糕的房东》情节 + 林知夏 / 闻笙人设加工',
    branches: [{ label: '看一个迟到七年的通知 —— 暴雨里撞见前任', to: 'qinian-mei-ren-tongzhi-wo' }],
  },
];

// 极简 frontmatter 解析：只取需要的标量字段，正文去掉首个 H1
function parseMarkdown(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error('缺少 frontmatter');
  const [, fm, rest] = m;
  const scalar = (key) => {
    const hit = fm.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
    if (!hit) return '';
    return hit[1].trim().replace(/\s+#.*$/, '').replace(/^["']|["']$/g, '');
  };
  const body = rest.replace(/^\s*#\s+.*\r?\n+/, '').trim();
  return { id: scalar('id'), title: scalar('title'), family: scalar('family'), body };
}

const stories = [];
for (const preset of PRESETS) {
  const raw = await readFile(path.join(STORIES_DIR, preset.file), 'utf8');
  const { id, title, family, body } = parseMarkdown(raw);
  if (!id || !title || !body) throw new Error(`${preset.file}: id/title/正文 不完整`);
  stories.push({
    id,
    title,
    family,
    content: body,
    bgm: preset.bgm,
    seedIds: [],
    prompt: preset.prompt,
    modelInfo: preset.modelInfo,
    branches: preset.branches.map((b) => ({ label: b.label, storyId: b.to })),
  });
}

// 分支目标必须都在预置集合里，否则读者点了会跳空
const ids = new Set(stories.map((s) => s.id));
for (const s of stories) {
  for (const b of s.branches) {
    if (!ids.has(b.storyId)) throw new Error(`${s.id} 的分支指向了不存在的故事：${b.storyId}`);
  }
}

await mkdir(path.dirname(OUT_FILE), { recursive: true });
await writeFile(OUT_FILE, JSON.stringify({ stories }, null, 2));

console.log(
  `[stories] ${stories.length} 篇 -> public/stories.json` +
    stories.map((s) => `\n  · ${s.title}（${s.content.length} 字，${s.branches.length} 个分支）`).join(''),
);

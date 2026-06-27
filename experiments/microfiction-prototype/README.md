# OpenBook · 微小说原型 v0.1

跑通"raw → 提示词加工 → 微小说"创作流水线 + 读者沉浸消费三件套（滑动 / BGM / 篇间分支）的最小可玩验证版。

> 与长线 OpenBook 产品 plan（`~/.claude/plans/swirling-honking-wreath.md`）解耦，定位是 **快速验证 prototype**，不进 v1.1 plan 工程。

---

## 启动

```bash
cd experiments/microfiction-prototype
cp .env.example .env
# 在 .env 里填 LLM_API_KEY（智谱 GLM-4-Flash 免费 key: https://bigmodel.cn）
npm install     # 已装则跳过
npm run dev
```

启动后两个进程：
- `vite`  → http://localhost:5173 （前端）
- `api`   → http://localhost:3001 （LLM 代理，前端通过 `/api` 走 vite 代理转发）

打开 http://localhost:5173 即可。

---

## 端到端流程

### 1. 投素材（Raw Data）
进入 **创作** 页 → 左侧"素材库" → "+ 新建素材"

最少投 2 条，覆盖：
- **世界观**：城市、时代、氛围
- **人设**：主角小传
- （可选）**情节**：一个具体场景或冲突

### 2. 加工（Prompt → 微小说）
"写作台" → 勾选 1+ 条素材 → 编辑/保留默认提示词 → "生成微小说"

生成后可继续手动编辑（**去 AI 化** 自我审计在这里发生）。

### 3. 配置 BGM（可选）
1. 把 mp3 放到 `public/bgm/`
2. 写作台保存时 "BGM URL" 字段填 `/bgm/<文件名>.mp3`

### 4. 篇间分支
"微小说库" → 点 "编辑分支"，最多设 2 个 → 每个分支填文案 + 选目标微小说

### 5. 读者端验证
顶栏切到 **阅读** → 点进入沉浸 → 上下滑动切换 → BGM 自动播放 → 篇尾的两个分支按钮跳到目标篇

---

## 数据 / 埋点

全部存在浏览器 **LocalStorage**：
- `openbook:materials` — 素材
- `openbook:stories` — 微小说（含 prompt + modelInfo + 分支）
- `openbook:events` — 阅读事件（view / complete / skip / choose_branch）

清空方法：浏览器 DevTools Console → `localStorage.clear()`

---

## v2 路线（不在本原型范围）

- BYOK：每位创作者自带 API key + provider，记录到 `Story.modelInfo`
- 创作者画像：聚合一位加工者下所有作品的读者完读率/转发，反哺
- "去 AI 化"审计 Agent：识别 AI 味重段落并提示
- 公开素材库 + 素材打分排序
- 同源分叉对比页

---

## 切换免费模型

`.env` 里把 `LLM_BASE_URL` / `LLM_MODEL` / `LLM_API_KEY` 三件套换掉即可。常见 OpenAI-compatible 提供方在 `.env.example` 里有列出（DeepSeek / Moonshot / OpenRouter free / OpenAI 等）。

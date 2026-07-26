import { useMemo, useState } from 'react';
import type { ModelInfo, Seed } from '../../types';
import { SEED_TYPE_LABEL } from '../../types';
import { storiesStore, newId } from '../../store/storage';
import { generate } from '../../api';

const SYSTEM_PROMPT = `你是 OpenBook 第一季的叙事编辑助手。你生成的是一篇可以进入连续阅读网络的节点初稿，不是脱离世界观的 AI 微小说。
AI 必须隐身：用已选种子保证人物、事件和城市语境一致，但成稿要有具体的人味、选择的后果和可被人工编辑的空间。

写作要求：
- 都市情感题材，建议 1200-2200 个中文字，最长不超过 2800 个中文字
- 从一个正在发生的具体场景切入；用一个物件、动作或对白建立张力，而非先介绍人物背景
- 只聚焦一段关系中的一个情绪转折，让人物的行动和事实推动情绪，不替读者总结
- 至少写出一处只属于这两个人、这座城市的细节或对白；人物动机要与种子一致
- 结尾必须让关系状态发生可感知的变化，为“靠近”与“离开”两种后续走向留下真实后果；不要在正文中写分支按钮、选项或解释
- 情绪浓度优先，但不靠突发死亡、暴力、性侵、疾病绝症、身份反转或狗血误会制造刺激
- 删除空泛比喻、模板化抒情、“不是……而是……”式结论、替人物定性的总结和 AI 常见套话
- 标题不超过 12 个字

输出格式：
第一行：标题
空一行
正文
（不要写其他元信息，不要加 markdown 标题符号）`;

const DEFAULT_USER_PROMPT = `请基于已选的同一 Family 种子，写 OpenBook 第一季中的一篇节点故事。

- 正文目标 1600-2000 个中文字，阅读时长约 3 分钟
- 从人物正在面对的一件小事切入，写出一个可见的关系变化
- 让读者读完会想把其中一句话保存或转给某个人
- 结尾应让编辑能分别接到“更靠近”或“转身离开”的后续故事，但正文不写选项文案
- 氛围可以克制，但不要压低情绪；拒绝为了文艺而模糊`;

interface Props {
  seeds: Seed[];
  selectedIds: string[];
  onSaved: () => void;
  onClearSelection: () => void;
}

export default function StoryWorkbench({ seeds, selectedIds, onSaved, onClearSelection }: Props) {
  const selectedSeeds = useMemo(
    () => seeds.filter((s) => selectedIds.includes(s.id)),
    [seeds, selectedIds],
  );

  const family = selectedSeeds[0]?.family ?? null;
  const familyMismatch = family !== null && selectedSeeds.some((s) => s.family !== family);

  const [userPrompt, setUserPrompt] = useState(DEFAULT_USER_PROMPT);
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState('');
  const [title, setTitle] = useState('');
  const [bgm, setBgm] = useState('');
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buildFullPrompt = () => {
    const blocks = selectedSeeds.map((s) => {
      return `【${SEED_TYPE_LABEL[s.type]} · ${s.title}】\n${s.content}`;
    });
    const familyLine = family ? `Family：${family}\n\n` : '';
    return `${familyLine}种子：\n\n${blocks.join('\n\n---\n\n')}\n\n补充提示：\n${userPrompt}`;
  };

  const onGenerate = async () => {
    if (selectedSeeds.length === 0) {
      setError('请先在种子库勾选 1+ 条同族种子');
      return;
    }
    if (familyMismatch) {
      setError('选中的种子非同族，无法一起生长');
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      const fullPrompt = buildFullPrompt();
      const res = await generate({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: fullPrompt,
        temperature: 0.85,
      });
      const lines = res.content.split('\n');
      const firstLine = lines[0]?.trim() ?? '';
      const rest = lines.slice(1).join('\n').trim();
      if (firstLine && rest) {
        setTitle(firstLine.replace(/^#+\s*/, ''));
        setDraft(rest);
      } else {
        setDraft(res.content);
      }
      setModelInfo(res.modelInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  const onSave = () => {
    if (!title.trim() || !draft.trim()) {
      setError('标题与正文不能为空');
      return;
    }
    if (!modelInfo) {
      setError('请先点"生成"，让模型信息进入记录');
      return;
    }
    storiesStore.upsert({
      id: newId(),
      title: title.trim(),
      content: draft.trim(),
      bgm: bgm.trim() || undefined,
      seedIds: selectedIds.slice(),
      family: family ?? undefined,
      prompt: userPrompt,
      modelInfo,
      branches: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setTitle('');
    setDraft('');
    setBgm('');
    setModelInfo(null);
    setUserPrompt(DEFAULT_USER_PROMPT);
    onClearSelection();
    onSaved();
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-white/80 tracking-wide">写作台</h2>

      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 flex flex-col gap-3">
        <div>
          <div className="text-xs text-white/40 mb-1.5">
            已选种子（{selectedSeeds.length}）
            {family && (
              <span className="ml-2 px-1.5 py-px rounded-full bg-white/10 text-white/70 text-[10px]">
                {family}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedSeeds.length === 0 && (
              <span className="text-xs text-white/30">从左侧勾选同族种子作为创作输入</span>
            )}
            {selectedSeeds.map((s) => (
              <span key={s.id} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                {SEED_TYPE_LABEL[s.type]}·{s.title}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs text-white/40 mb-1.5">补充提示词</div>
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            rows={3}
            className="w-full bg-black/30 border border-white/10 rounded p-2 text-sm leading-relaxed focus:outline-none focus:border-white/30 resize-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onGenerate}
            disabled={generating || selectedSeeds.length === 0 || familyMismatch}
            className="text-sm px-4 py-1.5 rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {generating ? '生成中…' : '生成微小说'}
          </button>
          {modelInfo && (
            <span className="text-xs text-white/40">
              模型：{modelInfo.provider} · {modelInfo.model}
            </span>
          )}
        </div>

        {error && <div className="text-xs text-red-300">{error}</div>}

        {(draft || title) && (
          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="标题"
              className="bg-transparent border-b border-white/15 px-1 py-1.5 text-base text-white focus:outline-none focus:border-white/40"
            />
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={14}
              className="w-full bg-black/30 border border-white/10 rounded p-3 text-sm leading-7 focus:outline-none focus:border-white/30 resize-y"
            />
            <input
              value={bgm}
              onChange={(e) => setBgm(e.target.value)}
              placeholder="BGM URL（可选，本地文件放 /content/bgm/ 后用 /bgm/xxx.mp3）"
              className="bg-transparent border-b border-white/15 px-1 py-1.5 text-xs text-white/80 focus:outline-none focus:border-white/40"
            />
            <div className="flex justify-end">
              <button
                onClick={onSave}
                className="text-sm px-4 py-1.5 rounded-full bg-emerald-500/90 hover:bg-emerald-500 text-black transition"
              >
                保存为微小说
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

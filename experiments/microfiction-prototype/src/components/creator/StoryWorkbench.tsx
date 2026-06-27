import { useMemo, useState } from 'react';
import type { ModelInfo, Seed } from '../../types';
import { SEED_TYPE_LABEL } from '../../types';
import { storiesStore, newId } from '../../store/storage';
import { generate } from '../../api';

const SYSTEM_PROMPT = `你是 OpenBook 平台的"加工者"——一位 AI-native 的微小说作者。
你最重要的能力是「去 AI 化」：用 AI 当工具，但写出有自己 voice 的文字。

写作要求：
- 篇幅 300–1500 字
- 都市情感题材，克制、有电影感
- 让画面与对白自己说话，不要解释、不要说教
- 人物动机清晰，避免狗血与玛丽苏
- 标题不超过 12 字

输出格式：
第一行：标题
空一行
正文
（不要写其他元信息，不要加 markdown 标题符号）`;

const DEFAULT_USER_PROMPT = `请基于上面的种子，写一篇 600–800 字的微小说。
氛围：城市深夜的克制感。`;

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

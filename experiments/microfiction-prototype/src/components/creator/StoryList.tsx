import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Story, BranchOption } from '../../types';
import { storiesStore } from '../../store/storage';

interface Props {
  stories: Story[];
  onChange: () => void;
}

export default function StoryList({ stories, onChange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const remove = (id: string) => {
    if (!confirm('删除这篇微小说？')) return;
    storiesStore.remove(id);
    onChange();
  };

  const updateBranches = (story: Story, branches: BranchOption[]) => {
    storiesStore.upsert({ ...story, branches });
    onChange();
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-white/80 tracking-wide">微小说库（{stories.length}）</h2>
        {stories.length > 0 && (
          <Link
            to="/reader"
            className="text-xs px-3 py-1 rounded-full bg-emerald-500/90 hover:bg-emerald-500 text-black transition"
          >
            进读者端 →
          </Link>
        )}
      </div>

      {stories.length === 0 && <div className="text-xs text-white/40">还没有微小说。先在写作台生成一篇。</div>}

      <ul className="flex flex-col gap-2">
        {stories.map((s) => {
          const expanded = expandedId === s.id;
          const branches = s.branches ?? [];
          return (
            <li key={s.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{s.title}</div>
                  <div className="text-xs text-white/40 mt-0.5">
                    {s.modelInfo.provider}·{s.modelInfo.model} · {s.content.length} 字 ·{' '}
                    {branches.length === 0 ? '无分支' : `${branches.length} 个分支`}
                    {s.bgm && ' · 🎵'}
                  </div>
                </div>
                <div className="flex gap-1 text-xs shrink-0">
                  <Link
                    to={`/reader/${s.id}`}
                    className="px-2 py-1 text-white/70 hover:text-white"
                  >
                    阅读
                  </Link>
                  <button
                    onClick={() => setExpandedId(expanded ? null : s.id)}
                    className="px-2 py-1 text-white/70 hover:text-white"
                  >
                    {expanded ? '收起' : '编辑分支'}
                  </button>
                  <button onClick={() => remove(s.id)} className="px-2 py-1 text-white/60 hover:text-red-300">
                    删除
                  </button>
                </div>
              </div>

              {expanded && (
                <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
                  <div className="text-xs text-white/50">篇间分支（"下一篇你选"）</div>
                  {[0, 1].map((idx) => {
                    const b = branches[idx] ?? { label: '', storyId: '' };
                    const setSlot = (next: BranchOption) => {
                      const arr = [branches[0] ?? { label: '', storyId: '' }, branches[1] ?? { label: '', storyId: '' }];
                      arr[idx] = next;
                      updateBranches(s, arr);
                    };
                    return (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          value={b.label}
                          onChange={(e) => setSlot({ label: e.target.value, storyId: b.storyId })}
                          placeholder={`分支 ${idx + 1} 文案（如：跟他走 / 转身离开）`}
                          className="flex-1 bg-transparent border-b border-white/10 px-1 py-1 text-sm focus:outline-none focus:border-white/30"
                        />
                        <select
                          value={b.storyId}
                          onChange={(e) => setSlot({ label: b.label, storyId: e.target.value })}
                          className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white/80 focus:outline-none focus:border-white/30"
                        >
                          <option value="">选目标微小说…</option>
                          {stories
                            .filter((t) => t.id !== s.id)
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.title}
                              </option>
                            ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

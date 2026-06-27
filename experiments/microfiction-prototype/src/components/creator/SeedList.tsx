import { useMemo, useState } from 'react';
import type { Seed, SeedType } from '../../types';
import { SEED_TYPE_LABEL } from '../../types';
import { seedsStore, newId } from '../../store/storage';

interface Props {
  seeds: Seed[];
  selectedIds: string[];
  onChange: () => void;
  onToggleSelect: (id: string) => void;
}

const TYPES: SeedType[] = ['worldview', 'character', 'plot', 'other'];

const NEW_FAMILY_TOKEN = '__new__';

interface SeedBundle {
  name: string;
  family: string;
  seeds: { type: SeedType; title: string; content: string }[];
}

export default function SeedList({ seeds, selectedIds, onChange, onToggleSelect }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ family: string; type: SeedType; title: string; content: string }>({
    family: '',
    type: 'worldview',
    title: '',
    content: '',
  });
  const [familyMode, setFamilyMode] = useState<'pick' | 'new'>('pick');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const knownFamilies = useMemo(() => {
    const set = new Set<string>();
    for (const s of seeds) if (s.family) set.add(s.family);
    return Array.from(set).sort();
  }, [seeds]);

  const lockedFamily = useMemo(() => {
    if (selectedIds.length === 0) return null;
    const first = seeds.find((s) => selectedIds.includes(s.id));
    return first?.family ?? null;
  }, [seeds, selectedIds]);

  const importSeeds = async () => {
    setImporting(true);
    setImportMsg(null);
    try {
      const res = await fetch('/api/seeds');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { bundles: SeedBundle[] };
      const flat = data.bundles.flatMap((b) =>
        b.seeds.map((s) => ({ ...s, family: b.family })),
      );
      if (flat.length === 0) {
        setImportMsg('未发现种子文件（seeds/*.seeds.json）');
        return;
      }
      const existing = new Set(seeds.map((s) => `${s.family}|${s.type}|${s.title}`));
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
        added++;
      }
      setImportMsg(`已导入 ${added} 条${skipped ? ` · 跳过 ${skipped} 条同名` : ''}`);
      onChange();
    } catch (err) {
      setImportMsg(`导入失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setImporting(false);
    }
  };

  const startNew = () => {
    setEditingId('new');
    const defaultFamily = knownFamilies[0] ?? '';
    setDraft({ family: defaultFamily, type: 'worldview', title: '', content: '' });
    setFamilyMode(defaultFamily ? 'pick' : 'new');
  };

  const startEdit = (s: Seed) => {
    setEditingId(s.id);
    setDraft({ family: s.family, type: s.type, title: s.title, content: s.content });
    setFamilyMode(knownFamilies.includes(s.family) ? 'pick' : 'new');
  };

  const save = () => {
    if (!draft.family.trim() || !draft.title.trim() || !draft.content.trim()) return;
    const isNew = editingId === 'new';
    const existing = !isNew && editingId ? seedsStore.get(editingId) : undefined;
    seedsStore.upsert({
      id: existing?.id ?? newId(),
      family: draft.family.trim(),
      type: draft.type,
      title: draft.title.trim(),
      content: draft.content.trim(),
      createdAt: existing?.createdAt ?? Date.now(),
    });
    setEditingId(null);
    onChange();
  };

  const remove = (id: string) => {
    if (!confirm('删除这条种子？')) return;
    seedsStore.remove(id);
    onChange();
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-white/80 tracking-wide">种子库</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={importSeeds}
            disabled={importing}
            className="text-xs px-3 py-1 rounded-full bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition disabled:opacity-50"
          >
            {importing ? '导入中…' : '导入种子'}
          </button>
          <button
            onClick={startNew}
            className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/90 transition"
          >
            + 新建种子
          </button>
        </div>
      </div>
      {importMsg && <div className="text-xs text-white/50">{importMsg}</div>}
      {lockedFamily && (
        <div className="text-xs text-white/50">
          已锁定 Family：<span className="text-white/80">{lockedFamily}</span>
          <span className="text-white/30"> · 别族种子已置灰，清空选择以切换</span>
        </div>
      )}

      {editingId && (
        <div className="rounded-lg border border-white/15 bg-white/5 p-3 flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-white/40">Family（同族才能一起生长）</span>
            <div className="flex items-center gap-2">
              <select
                value={familyMode === 'new' ? NEW_FAMILY_TOKEN : draft.family}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === NEW_FAMILY_TOKEN) {
                    setFamilyMode('new');
                    setDraft((d) => ({ ...d, family: '' }));
                  } else {
                    setFamilyMode('pick');
                    setDraft((d) => ({ ...d, family: v }));
                  }
                }}
                className="bg-black/40 border border-white/15 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-white/40"
              >
                {knownFamilies.length === 0 && <option value="">（无现有 Family）</option>}
                {knownFamilies.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
                <option value={NEW_FAMILY_TOKEN}>+ 新建 Family</option>
              </select>
              {familyMode === 'new' && (
                <input
                  value={draft.family}
                  onChange={(e) => setDraft((d) => ({ ...d, family: e.target.value }))}
                  placeholder="新 Family 名（如：上海 · 弄堂）"
                  className="flex-1 bg-transparent border-b border-white/15 px-1 py-1 text-sm focus:outline-none focus:border-white/40"
                />
              )}
            </div>
          </div>

          <div className="flex gap-1">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setDraft((d) => ({ ...d, type: t }))}
                className={`text-xs px-2.5 py-1 rounded-full transition ${
                  draft.type === t ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                {SEED_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="标题（如：林婉，30 岁，外贸主管）"
            className="bg-transparent border-b border-white/15 px-1 py-1.5 text-sm focus:outline-none focus:border-white/40"
          />
          <textarea
            value={draft.content}
            onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
            placeholder="内容（生活素材、人物描述、情节碎片……）"
            rows={5}
            className="bg-transparent border border-white/15 rounded p-2 text-sm leading-relaxed focus:outline-none focus:border-white/40 resize-none"
          />
          <div className="flex justify-end items-center gap-2 text-xs">
            {(!draft.family.trim() || !draft.title.trim() || !draft.content.trim()) && (
              <span className="text-white/40 mr-auto">Family、标题、内容都要填</span>
            )}
            <button onClick={() => setEditingId(null)} className="px-3 py-1 text-white/60 hover:text-white">
              取消
            </button>
            <button
              onClick={save}
              disabled={!draft.family.trim() || !draft.title.trim() || !draft.content.trim()}
              className="px-3 py-1 rounded-full bg-white text-black hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40 disabled:cursor-not-allowed"
            >
              保存
            </button>
          </div>
        </div>
      )}

      <ul className="flex flex-col gap-1.5">
        {seeds.length === 0 && !editingId && (
          <li className="text-xs text-white/40 py-3">还没有种子。点击右上角"导入种子"或"新建种子"开始。</li>
        )}
        {seeds.map((s) => {
          const selected = selectedIds.includes(s.id);
          const expanded = expandedId === s.id;
          const lockedOut = lockedFamily !== null && s.family !== lockedFamily && !selected;
          return (
            <li
              key={s.id}
              className={`group rounded-lg border transition px-3 py-2 ${
                selected
                  ? 'border-white/40 bg-white/10'
                  : lockedOut
                    ? 'border-white/5 bg-white/[0.02] opacity-40'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/25'
              }`}
            >
              <div className="flex items-start gap-2">
                <button
                  onClick={() => {
                    if (lockedOut) return;
                    onToggleSelect(s.id);
                  }}
                  disabled={lockedOut}
                  className={`mt-0.5 size-4 shrink-0 rounded-sm border transition ${
                    selected ? 'bg-white border-white' : 'border-white/30'
                  } ${lockedOut ? 'cursor-not-allowed' : ''}`}
                  aria-label={selected ? '取消选中' : lockedOut ? '与已选种子非同族' : '选中'}
                  title={lockedOut ? `已锁定 Family：${lockedFamily}` : undefined}
                >
                  {selected && (
                    <svg viewBox="0 0 16 16" className="size-full fill-black p-0.5">
                      <path d="M6 11.5 2.5 8l1-1L6 9.5l6.5-6.5 1 1z" />
                    </svg>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : s.id)}
                  className="flex-1 min-w-0 text-left"
                  aria-expanded={expanded}
                >
                  <div className="flex items-center gap-2 text-xs text-white/50">
                    <span className="px-1.5 py-px rounded-full bg-white/10 text-white/70 text-[10px]">
                      {s.family}
                    </span>
                    <span>{SEED_TYPE_LABEL[s.type]}</span>
                    <span>·</span>
                    <span className="truncate">{s.title}</span>
                  </div>
                  <p
                    className={`mt-0.5 text-sm text-white/80 ${
                      expanded ? 'whitespace-pre-wrap leading-relaxed' : 'line-clamp-2'
                    }`}
                  >
                    {s.content}
                  </p>
                </button>
                <div
                  className={`${expanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition flex gap-1 text-xs`}
                >
                  <button onClick={() => startEdit(s)} className="text-white/60 hover:text-white px-1">
                    编辑
                  </button>
                  <button onClick={() => remove(s.id)} className="text-white/60 hover:text-red-300 px-1">
                    删除
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

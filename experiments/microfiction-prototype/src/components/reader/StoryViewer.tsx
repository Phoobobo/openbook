import { useEffect, useRef } from 'react';
import type { Story } from '../../types';

interface Props {
  story: Story;
  index: number;
  onActiveChange: (active: boolean) => void;
  onComplete: () => void;
  onChooseBranch: (storyId: string) => void;
  registerSection: (index: number, el: HTMLElement | null) => void;
}

export default function StoryViewer({
  story,
  index,
  onActiveChange,
  onComplete,
  onChooseBranch,
  registerSection,
}: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    registerSection(index, el);
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          onActiveChange(entry.intersectionRatio > 0.55);
        }
      },
      { threshold: [0, 0.55, 1] },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      registerSection(index, null);
    };
  }, [index, onActiveChange, registerSection]);

  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !completedRef.current) {
            completedRef.current = true;
            onComplete();
          }
        }
      },
      { threshold: 0.9 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onComplete]);

  const validBranches = (story.branches ?? []).filter((b) => b.label.trim() && b.storyId);

  return (
    <section
      ref={sectionRef}
      data-story-id={story.id}
      className="snap-start min-h-[100svh] flex justify-center"
    >
      <article className="w-full max-w-xl px-5 py-16 flex flex-col">
        <header className="mb-6">
          <h1 className="text-2xl font-medium text-white tracking-wide leading-snug">{story.title}</h1>
          <div className="mt-2 text-xs text-white/40">
            {story.modelInfo.provider}·{story.modelInfo.model} · {story.content.length} 字
          </div>
        </header>
        <div className="text-[15px] leading-8 text-white/85 whitespace-pre-wrap">{story.content}</div>
        <div ref={endRef} className="h-4" />

        <div className="mt-12 pt-6 border-t border-white/10">
          {validBranches.length > 0 ? (
            <>
              <div className="text-xs text-white/40 mb-3 tracking-wide">下一篇你选</div>
              <div className="flex flex-col gap-2">
                {validBranches.map((b) => (
                  <button
                    key={b.storyId}
                    onClick={() => onChooseBranch(b.storyId)}
                    className="text-left px-4 py-3 rounded-lg border border-white/15 hover:border-white/40 hover:bg-white/5 transition text-white/85"
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="text-xs text-white/30">— 未配置篇间分支 —</div>
          )}
        </div>
      </article>
    </section>
  );
}

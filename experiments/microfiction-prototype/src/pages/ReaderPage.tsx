import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StoryViewer from '../components/reader/StoryViewer';
import BGMPlayer from '../components/reader/BGMPlayer';
import { eventsStore, storiesStore } from '../store/storage';
import type { Story } from '../types';

export default function ReaderPage() {
  const { storyId } = useParams();
  const [stories, setStories] = useState<Story[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const sectionsRef = useRef<Map<number, HTMLElement>>(new Map());
  const completedRef = useRef<Set<string>>(new Set());
  const lastActiveStoryIdRef = useRef<string | null>(null);

  useEffect(() => {
    const refresh = () => setStories(storiesStore.list().slice().reverse());
    refresh();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'openbook:stories' || e.key === null) refresh();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const startIndex = useMemo(() => {
    if (!storyId) return 0;
    const idx = stories.findIndex((s) => s.id === storyId);
    return idx >= 0 ? idx : 0;
  }, [stories, storyId]);

  useEffect(() => {
    if (stories.length === 0) return;
    const el = sectionsRef.current.get(startIndex);
    if (el) {
      el.scrollIntoView({ behavior: 'auto' });
      setActiveIndex(startIndex);
    }
  }, [stories, startIndex]);

  const registerSection = useCallback((index: number, el: HTMLElement | null) => {
    if (el) sectionsRef.current.set(index, el);
    else sectionsRef.current.delete(index);
  }, []);

  const handleActiveChange = useCallback(
    (index: number, story: Story) => (active: boolean) => {
      if (!active) return;
      setActiveIndex(index);
      const prevId = lastActiveStoryIdRef.current;
      if (prevId && prevId !== story.id && !completedRef.current.has(prevId)) {
        eventsStore.append({ storyId: prevId, kind: 'skip' });
      }
      if (prevId !== story.id) {
        eventsStore.append({ storyId: story.id, kind: 'view' });
        lastActiveStoryIdRef.current = story.id;
      }
    },
    [],
  );

  const handleComplete = useCallback(
    (story: Story) => () => {
      if (completedRef.current.has(story.id)) return;
      completedRef.current.add(story.id);
      eventsStore.append({ storyId: story.id, kind: 'complete' });
    },
    [],
  );

  const handleChooseBranch = useCallback(
    (fromStory: Story) => (toStoryId: string) => {
      eventsStore.append({
        storyId: fromStory.id,
        kind: 'choose_branch',
        details: { to: toStoryId },
      });
      const idx = stories.findIndex((s) => s.id === toStoryId);
      const el = sectionsRef.current.get(idx);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    },
    [stories],
  );

  const onUnlock = () => setUnlocked(true);

  if (stories.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-white/60">
        <div>还没有微小说可读。</div>
        <Link to="/creator" className="text-xs px-3 py-1.5 rounded-full bg-white text-black hover:bg-white/90">
          去写作台
        </Link>
      </div>
    );
  }

  const activeStory = stories[activeIndex];

  return (
    <div className="relative h-[calc(100svh-49px)] overflow-hidden">
      {!unlocked && (
        <button
          onClick={onUnlock}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/85 backdrop-blur"
        >
          <div className="text-base text-white/90">点击进入沉浸阅读</div>
          <div className="text-xs text-white/50">向下滑动切换微小说 · BGM 会自动播放</div>
        </button>
      )}

      <BGMPlayer src={activeStory?.bgm} unlocked={unlocked} />

      <div
        className="h-full overflow-y-auto snap-y snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        {stories.map((s, i) => (
          <StoryViewer
            key={s.id}
            story={s}
            index={i}
            onActiveChange={handleActiveChange(i, s)}
            onComplete={handleComplete(s)}
            onChooseBranch={handleChooseBranch(s)}
            registerSection={registerSection}
          />
        ))}
      </div>
    </div>
  );
}

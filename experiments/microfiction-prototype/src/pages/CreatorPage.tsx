import { useEffect, useState } from 'react';
import SeedList from '../components/creator/SeedList';
import StoryWorkbench from '../components/creator/StoryWorkbench';
import StoryList from '../components/creator/StoryList';
import LlmKeyBar from '../components/creator/LlmKeyBar';
import { seedsStore, storiesStore } from '../store/storage';
import { bootstrapDemoDataOnce } from '../store/bootstrap';
import type { Seed, Story } from '../types';

export default function CreatorPage() {
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const reload = () => {
    setSeeds(seedsStore.list());
    setStories(storiesStore.list());
  };

  useEffect(() => {
    reload();
    // 首次访问自动带好种子库和故事库，演示时不用先点「导入种子」
    let alive = true;
    bootstrapDemoDataOnce().then(({ seeds, stories }) => {
      if (alive && seeds + stories > 0) reload();
    });
    return () => {
      alive = false;
    };
  }, []);

  const toggleSelect = (id: string) =>
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <div className="max-w-6xl mx-auto px-5 py-6 flex flex-col gap-6">
      <LlmKeyBar />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,1fr)_minmax(0,2fr)] gap-6">
      <div className="flex flex-col gap-6 min-w-0">
        <SeedList
          seeds={seeds}
          selectedIds={selectedIds}
          onChange={reload}
          onToggleSelect={toggleSelect}
        />
      </div>
      <div className="flex flex-col gap-8 min-w-0">
        <StoryWorkbench
          seeds={seeds}
          selectedIds={selectedIds}
          onSaved={reload}
          onClearSelection={() => setSelectedIds([])}
        />
        <StoryList stories={stories} onChange={reload} />
      </div>
      </div>
    </div>
  );
}

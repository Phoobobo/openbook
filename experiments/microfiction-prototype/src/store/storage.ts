import type { Seed, Story, ReadingEvent } from '../types';

const KEYS = {
  seeds: 'openbook:seeds',
  stories: 'openbook:stories',
  events: 'openbook:events',
} as const;

const LEGACY_MATERIALS_KEY = 'openbook:materials';
const LEGACY_DEFAULT_FAMILY = '北京 · 都市群像';

function migrateLegacyMaterials(): void {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem(KEYS.seeds) !== null) return;
  const legacy = localStorage.getItem(LEGACY_MATERIALS_KEY);
  if (!legacy) return;
  try {
    const parsed = JSON.parse(legacy);
    if (!Array.isArray(parsed)) return;
    const migrated: Seed[] = parsed.map((m: Record<string, unknown>) => ({
      id: String(m.id ?? newId()),
      family: typeof m.family === 'string' && m.family ? m.family : LEGACY_DEFAULT_FAMILY,
      type: (m.type as Seed['type']) ?? 'other',
      title: String(m.title ?? ''),
      content: String(m.content ?? ''),
      createdAt: typeof m.createdAt === 'number' ? m.createdAt : Date.now(),
    }));
    localStorage.setItem(KEYS.seeds, JSON.stringify(migrated));
  } catch {
    // ignore
  }
}

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

migrateLegacyMaterials();

export const seedsStore = {
  list: () => read<Seed>(KEYS.seeds),
  get: (id: string) => read<Seed>(KEYS.seeds).find((s) => s.id === id),
  upsert: (seed: Seed) => {
    const all = read<Seed>(KEYS.seeds);
    const idx = all.findIndex((s) => s.id === seed.id);
    if (idx >= 0) all[idx] = seed;
    else all.unshift(seed);
    write(KEYS.seeds, all);
  },
  remove: (id: string) => {
    write(
      KEYS.seeds,
      read<Seed>(KEYS.seeds).filter((s) => s.id !== id),
    );
  },
};

export const storiesStore = {
  list: () => read<Story>(KEYS.stories),
  get: (id: string) => read<Story>(KEYS.stories).find((s) => s.id === id),
  upsert: (story: Story) => {
    const all = read<Story>(KEYS.stories);
    const idx = all.findIndex((s) => s.id === story.id);
    if (idx >= 0) all[idx] = { ...story, updatedAt: Date.now() };
    else all.unshift(story);
    write(KEYS.stories, all);
  },
  remove: (id: string) => {
    write(KEYS.stories, read<Story>(KEYS.stories).filter((s) => s.id !== id));
  },
};

export const eventsStore = {
  list: () => read<ReadingEvent>(KEYS.events),
  append: (event: Omit<ReadingEvent, 'id' | 'timestamp'>) => {
    const all = read<ReadingEvent>(KEYS.events);
    all.push({ ...event, id: newId(), timestamp: Date.now() });
    write(KEYS.events, all);
  },
  clear: () => write(KEYS.events, []),
};

export function exportAll() {
  return {
    seeds: seedsStore.list(),
    stories: storiesStore.list(),
    events: eventsStore.list(),
  };
}

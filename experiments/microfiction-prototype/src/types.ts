export type SeedType = 'worldview' | 'character' | 'plot' | 'other';

export const SEED_TYPE_LABEL: Record<SeedType, string> = {
  worldview: '世界观',
  character: '人设',
  plot: '情节',
  other: '其他',
};

export interface Seed {
  id: string;
  family: string;
  type: SeedType;
  title: string;
  content: string;
  createdAt: number;
}

export interface ModelInfo {
  provider: string;
  model: string;
}

export interface BranchOption {
  label: string;
  storyId: string;
}

export interface Story {
  id: string;
  title: string;
  content: string;
  bgm?: string;
  seedIds: string[];
  family?: string;
  prompt: string;
  modelInfo: ModelInfo;
  branches: BranchOption[];
  createdAt: number;
  updatedAt: number;
}

export type ReadingEventKind = 'view' | 'complete' | 'skip' | 'choose_branch';

export interface ReadingEvent {
  id: string;
  storyId: string;
  kind: ReadingEventKind;
  details?: Record<string, unknown>;
  timestamp: number;
}

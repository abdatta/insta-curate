import type { Post } from '@shared/types';

// Re-export shared types as the source of truth
export { MediaType } from '@shared/types';
export type { Post } from '@shared/types';

export interface RunStatus {
  status: 'running' | 'completed' | 'failed' | 'idle';
  message?: string;
  started_at?: string;
  finished_at?: string;
}

export interface CuratedResponse {
  run: RunStatus;
  posts: Post[];
  latestSuccessfulRunId?: number;
}

export interface Task {
  handle: string;
  status: 'pending' | 'processing' | 'done' | 'failed' | 'skipped';
  message?: string;
}

export interface ProgressResponse {
  status: string;
  tasks: Task[];
  curatedCount?: number;
  error?: string;
}

export interface Settings {
  schedule_enabled: boolean;
  schedule_interval_hours: number;
  notification_skip_empty: boolean;
}

export interface Profile {
  id: number;
  handle: string;
  is_enabled: number;
  total_curated?: number;
  liked_curated?: number;
}

export interface ProfilesResponse {
  profiles: Profile[];
}

export interface Post {
  shortcode: string;
  caption: string;
  posted_at: string; // ISO date
  score: number;
  comment_count: number;
  like_count: number;
  media_type: string;
  display_url: string; // or similar
  profile_handle: string;
  has_liked: boolean;
  user_comment?: string;
  run_id?: number;
  run_date?: string;
  post_url?: string;
}

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
}

export interface Profile {
  id: number;
  handle: string;
  is_enabled: number;
}

export interface ProfilesResponse {
  profiles: Profile[];
}

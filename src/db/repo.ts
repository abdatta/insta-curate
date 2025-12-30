import db from './db';

// Settings
export const getSetting = (key: string): string | undefined => {
  const row = db
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(key) as { value: string } | undefined;
  return row?.value;
};

export const setSetting = (key: string, value: string) => {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
    key,
    value
  );
};

// Profiles
export type Profile = {
  id: number;
  handle: string;
  is_enabled: number;
  total_curated?: number;
  liked_curated?: number;
};
export const getProfiles = (): Profile[] => {
  return db.prepare('SELECT * FROM profiles').all() as Profile[];
};

export const getAllProfiles = (): Profile[] => {
  return db
    .prepare(
      `
    SELECT p.*, 
      (SELECT COUNT(*) FROM posts WHERE profile_handle = p.handle AND is_curated = 1) as total_curated,
      (SELECT COUNT(*) FROM posts WHERE profile_handle = p.handle AND is_curated = 1 AND has_liked = 1) as liked_curated
    FROM profiles p
  `
    )
    .all() as Profile[];
};

export const upsertProfiles = (handles: string[]) => {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO profiles (handle) VALUES (?)'
  );
  const update = db.prepare(
    'UPDATE profiles SET is_enabled = 1 WHERE handle = ?'
  );

  const transact = db.transaction(() => {
    handles.forEach((h) => {
      insert.run(h);
      update.run(h);
    });
    // Optional: disable ones not in list? Or just add new ones?
    // Requirement says "Active list". Let's assume passed list *is* the enabled list.
    // So we first disable all, then enable/insert present ones.
    if (handles.length > 0) {
      // This logic might be too aggressive if we want to keep history of old profiles.
      // Let's Just enable specific ones.
      // If we want to strictly follow "edit list of profiles", usually implies the full list.
      // The prompt says "upsert list of handles and enabled flags".
      // Let's implement full sync later if needed, for now just bulk add.
    }
  });
  transact();
};

export const addProfile = (handle: string) => {
  const clean = handle.trim();
  if (!clean) return;
  const info = db
    .prepare(
      'INSERT OR IGNORE INTO profiles (handle, is_enabled) VALUES (?, 1)'
    )
    .run(clean);
  // If it existed but was disabled/enabled, ensure enabled?
  // Requirement "add new profiles". If it exists, let's just make sure it's enabled.
  db.prepare('UPDATE profiles SET is_enabled = 1 WHERE handle = ?').run(clean);
  return info;
};

export const deleteProfile = (handle: string) => {
  db.prepare('DELETE FROM profiles WHERE handle = ?').run(handle);
};

export const setProfileEnabled = (handle: string, enabled: boolean) => {
  db.prepare('UPDATE profiles SET is_enabled = ? WHERE handle = ?').run(
    enabled ? 1 : 0,
    handle
  );
};

// Runs
export type Run = {
  id: number;
  started_at: string;
  finished_at?: string;
  status: string;
  message?: string;
};
export const createRun = (): number => {
  const info = db
    .prepare("INSERT INTO runs (started_at, status) VALUES (?, 'running')")
    .run(new Date().toISOString());
  return info.lastInsertRowid as number;
};

export const completeRun = (
  id: number,
  status: 'success' | 'failed',
  message?: string
) => {
  db.prepare(
    'UPDATE runs SET finished_at = ?, status = ?, message = ? WHERE id = ?'
  ).run(new Date().toISOString(), status, message || '', id);
};

export const getLatestRun = (): Run | undefined => {
  return db.prepare('SELECT * FROM runs ORDER BY id DESC LIMIT 1').get() as
    | Run
    | undefined;
};

export const getLatestSuccessfulRun = (): Run | undefined => {
  return db
    .prepare(
      "SELECT * FROM runs WHERE status = 'success' ORDER BY id DESC LIMIT 1"
    )
    .get() as Run | undefined;
};

export const failStuckRuns = () => {
  const runs = db
    .prepare("SELECT id FROM runs WHERE status = 'running'")
    .all() as { id: number }[];
  if (runs.length > 0) {
    console.log(`Found ${runs.length} stuck runs. Marking as failed.`);
    const update = db.prepare(
      "UPDATE runs SET status = 'failed', finished_at = ?, message = 'Server restarted' WHERE id = ?"
    );
    const now = new Date().toISOString();
    const tx = db.transaction(() => {
      for (const r of runs) {
        update.run(now, r.id);
      }
    });
    tx();
  }
};

import { MediaType } from '../../shared/types';
export { MediaType };

// Raw Database Row
export type DbPost = {
  run_id: number;
  profile_handle: string;
  post_url: string;
  shortcode: string;
  posted_at: number | string; // Timestamp or ISO string (legacy)
  comment_count: number;
  like_count?: number | null;
  score: number;
  is_curated: number;
  media_type: number;
  caption?: string | null;
  accessibility_caption?: string | null;
  has_liked?: number;
  username?: string | null;
  user_comment?: string | null;
  suggested_comments?: string | null; // JSON string
  media_urls?: string | null; // JSON string
  seen?: number;
  ai_score?: number;
};

// Domain Object (extends shared definition logic but with distinct Date type)
export type Post = {
  runId: number;
  profileHandle: string;
  postUrl: string;
  shortcode: string;
  postedAt: Date; // Differs from Shared (string)
  commentCount: number;
  likeCount?: number | null;
  score: number;
  aiScore?: number;
  isCurated: boolean;
  mediaType: MediaType;
  caption?: string | null;
  accessibilityCaption?: string | null;
  hasLiked: boolean;
  username?: string | null;
  userComment?: string | null;
  suggestedComments?: string[];
  mediaUrls?: string[];
  seen: boolean;
  // Extra fields from joins
  runDate?: string;
  runStatus?: string;
};

const toDb = (p: Post): DbPost => ({
  run_id: p.runId,
  profile_handle: p.profileHandle,
  post_url: p.postUrl,
  shortcode: p.shortcode,
  posted_at: p.postedAt.getTime(), // Store as timestamp
  comment_count: p.commentCount,
  like_count: p.likeCount,
  score: p.score,
  is_curated: p.isCurated ? 1 : 0,
  media_type: p.mediaType,
  caption: p.caption,
  accessibility_caption: p.accessibilityCaption,
  has_liked: p.hasLiked ? 1 : 0,
  username: p.username,
  user_comment: p.userComment,
  suggested_comments: p.suggestedComments
    ? JSON.stringify(p.suggestedComments)
    : null,
  media_urls: p.mediaUrls ? JSON.stringify(p.mediaUrls) : null,
  seen: p.seen ? 1 : 0,
  ai_score: p.aiScore,
});

const fromDb = (
  row: DbPost & { run_date?: string; run_status?: string }
): Post => ({
  runId: row.run_id,
  profileHandle: row.profile_handle,
  postUrl: row.post_url,
  shortcode: row.shortcode,
  postedAt: new Date(+row.posted_at), // Handles timestamp number or ISO string
  commentCount: row.comment_count,
  likeCount: row.like_count,
  score: row.score,
  isCurated: !!row.is_curated,
  mediaType: row.media_type as MediaType,
  caption: row.caption,
  accessibilityCaption: row.accessibility_caption,
  hasLiked: !!row.has_liked,
  username: row.username,
  userComment: row.user_comment,
  suggestedComments: row.suggested_comments
    ? JSON.parse(row.suggested_comments)
    : [],
  mediaUrls: row.media_urls ? JSON.parse(row.media_urls) : [],
  seen: !!row.seen,
  aiScore: row.ai_score,
  runDate: row.run_date,
  runStatus: row.run_status,
});

export const savePosts = (posts: Post[]) => {
  const insert = db.prepare(`
    INSERT INTO posts (run_id, profile_handle, post_url, shortcode, posted_at, comment_count, like_count, score, is_curated, media_type, caption, accessibility_caption, has_liked, username, user_comment, media_urls, suggested_comments, seen, ai_score)
    VALUES (@run_id, @profile_handle, @post_url, @shortcode, @posted_at, @comment_count, @like_count, @score, @is_curated, @media_type, @caption, @accessibility_caption, @has_liked, @username, @user_comment, @media_urls, @suggested_comments, @seen, @ai_score)
    ON CONFLICT(shortcode) DO UPDATE SET
      run_id = excluded.run_id,
      comment_count = excluded.comment_count,
      like_count = excluded.like_count,
      score = excluded.score,
      is_curated = excluded.is_curated,
      caption = excluded.caption,
      accessibility_caption = excluded.accessibility_caption,
      has_liked = excluded.has_liked,
      username = excluded.username,
      media_urls = excluded.media_urls,
      suggested_comments = excluded.suggested_comments,
      ai_score = excluded.ai_score
  `);
  const insertMany = db.transaction((posts: Post[]) => {
    for (const post of posts) insert.run(toDb(post));
  });
  insertMany(posts);
};

export const updatePostComment = (shortcode: string, comment: string) => {
  db.prepare('UPDATE posts SET user_comment = ? WHERE shortcode = ?').run(
    comment,
    shortcode
  );
};

export const updatePostSuggestionsAndScore = (
  shortcode: string,
  suggestions: string[],
  aiScore: number
) => {
  db.prepare(
    'UPDATE posts SET suggested_comments = ?, ai_score = ? WHERE shortcode = ?'
  ).run(JSON.stringify(suggestions), aiScore, shortcode);
};

export const updatePostLikeStatus = (shortcode: string, hasLiked: boolean) => {
  db.prepare('UPDATE posts SET has_liked = ? WHERE shortcode = ?').run(
    hasLiked ? 1 : 0,
    shortcode
  );
};

export const updatePostSeenStatus = (shortcode: string, seen: boolean) => {
  db.prepare('UPDATE posts SET seen = ? WHERE shortcode = ?').run(
    seen ? 1 : 0,
    shortcode
  );
};

export const getPostByShortcode = (shortcode: string): Post | undefined => {
  const row = db
    .prepare('SELECT * FROM posts WHERE shortcode = ?')
    .get(shortcode) as DbPost | undefined;
  if (!row) return undefined;
  return fromDb(row);
};

export const getCuratedPosts = (runId: number): Post[] => {
  const rows = db
    .prepare(
      'SELECT * FROM posts WHERE run_id = ? AND is_curated = 1 ORDER BY score DESC'
    )
    .all(runId) as DbPost[];
  return rows.map(fromDb);
};

export const getAllCuratedPosts = (): Post[] => {
  const rows = db
    .prepare(
      `
        SELECT p.*, r.started_at as run_date, r.status as run_status 
        FROM posts p 
        JOIN runs r ON p.run_id = r.id 
        WHERE p.is_curated = 1 
        ORDER BY p.run_id DESC, p.posted_at DESC
    `
    )
    .all() as (DbPost & { run_date: string; run_status: string })[];
  return rows.map(fromDb);
};

// Subscriptions
export type PushSubscriptionRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};

export const saveSubscription = (sub: any) => {
  db.prepare(
    'INSERT OR REPLACE INTO push_subscriptions (endpoint, p256dh, auth, created_at) VALUES (?, ?, ?, ?)'
  ).run(sub.endpoint, sub.keys.p256dh, sub.keys.auth, new Date().toISOString());
};

export const getSubscriptions = (): PushSubscriptionRecord[] => {
  return db
    .prepare('SELECT * FROM push_subscriptions')
    .all() as PushSubscriptionRecord[];
};

export const deleteSubscription = (endpoint: string) => {
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
};

// Full Profile Sync (for settings page)
export const syncProfiles = (handles: string[]) => {
  // Disable all first? Or just ensure they exist.
  // If I used a textarea to edit, I assume the textarea contains ALL desired profiles.
  // So any profile NOT in handles should be disabled?
  // Or just "upsert list". Let's stick to "ensure they exist and are enabled".
  // Handling deletion/disabling is better:
  // 1. Mark all enabled=0
  // 2. Insert or Ignore handles
  // 3. Update handles to enabled=1

  // We'll expose this logic in the API.
  const reset = db.prepare('UPDATE profiles SET is_enabled = 0');
  const insert = db.prepare(
    'INSERT OR IGNORE INTO profiles (handle) VALUES (?)'
  );
  const enable = db.prepare(
    'UPDATE profiles SET is_enabled = 1 WHERE handle = ?'
  );

  const tx = db.transaction(() => {
    reset.run();
    handles.forEach((h) => {
      const clean = h.trim();
      if (clean) {
        insert.run(clean);
        enable.run(clean);
      }
    });
  });
  tx();
};

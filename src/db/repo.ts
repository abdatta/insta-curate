import db from './db';

// Settings
export const getSetting = (key: string): string | undefined => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value;
};

export const setSetting = (key: string, value: string) => {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
};

// Profiles
export type Profile = { id: number; handle: string; is_enabled: number };
export const getProfiles = (): Profile[] => {
  return db.prepare('SELECT * FROM profiles').all() as Profile[];
};

export const upsertProfiles = (handles: string[]) => {
  const insert = db.prepare('INSERT OR IGNORE INTO profiles (handle) VALUES (?)');
  const update = db.prepare('UPDATE profiles SET is_enabled = 1 WHERE handle = ?');
  const disableAll = db.prepare('UPDATE profiles SET is_enabled = 0');
  
  const transact = db.transaction(() => {
    handles.forEach(h => {
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

export const setProfileEnabled = (handle: string, enabled: boolean) => {
    db.prepare('UPDATE profiles SET is_enabled = ? WHERE handle = ?').run(enabled ? 1 : 0, handle);
};

export const getAllProfiles = (): Profile[] => {
    return db.prepare('SELECT * FROM profiles').all() as Profile[];
};


// Runs
export type Run = { id: number; started_at: string; finished_at?: string; status: string; message?: string };
export const createRun = (): number => {
  const info = db.prepare("INSERT INTO runs (started_at, status) VALUES (?, 'running')").run(new Date().toISOString());
  return info.lastInsertRowid as number;
};

export const completeRun = (id: number, status: 'success' | 'failed', message?: string) => {
  db.prepare('UPDATE runs SET finished_at = ?, status = ?, message = ? WHERE id = ?').run(new Date().toISOString(), status, message || '', id);
};

export const getLatestRun = (): Run | undefined => {
  return db.prepare('SELECT * FROM runs ORDER BY id DESC LIMIT 1').get() as Run | undefined;
};

export const failStuckRuns = () => {
    const runs = db.prepare("SELECT id FROM runs WHERE status = 'running'").all() as {id: number}[];
    if (runs.length > 0) {
        console.log(`Found ${runs.length} stuck runs. Marking as failed.`);
        const update = db.prepare("UPDATE runs SET status = 'failed', finished_at = ?, message = 'Server restarted' WHERE id = ?");
        const now = new Date().toISOString();
        const tx = db.transaction(() => {
            for (const r of runs) {
                update.run(now, r.id);
            }
        });
        tx();
    }
}

// Posts
export type InputPost = {
  run_id: number;
  profile_handle: string;
  post_url: string;
  shortcode: string;
  posted_at: string;
  comment_count: number;
  like_count?: number | null;
  score: number;
  is_curated: number;
  media_type: number;
  caption?: string | null;
  accessibility_caption?: string | null;
  has_liked?: number;
  username?: string | null;
};

export const savePosts = (posts: InputPost[]) => {
  const insert = db.prepare(`
    INSERT INTO posts (run_id, profile_handle, post_url, shortcode, posted_at, comment_count, like_count, score, is_curated, media_type, caption, accessibility_caption, has_liked, username)
    VALUES (@run_id, @profile_handle, @post_url, @shortcode, @posted_at, @comment_count, @like_count, @score, @is_curated, @media_type, @caption, @accessibility_caption, @has_liked, @username)
  `);
  const insertMany = db.transaction((posts: InputPost[]) => {
    for (const post of posts) insert.run(post);
  });
  insertMany(posts);
};

export const getCuratedPosts = (runId: number) => {
  return db.prepare('SELECT * FROM posts WHERE run_id = ? AND is_curated = 1 ORDER BY score DESC').all(runId);
};

// Subscriptions
export type PushSubscriptionRecord = { endpoint: string; p256dh: string; auth: string; created_at: string };

export const saveSubscription = (sub: any) => {
  db.prepare('INSERT OR REPLACE INTO push_subscriptions (endpoint, p256dh, auth, created_at) VALUES (?, ?, ?, ?)').run(sub.endpoint, sub.keys.p256dh, sub.keys.auth, new Date().toISOString());
};

export const getSubscriptions = (): PushSubscriptionRecord[] => {
    return db.prepare('SELECT * FROM push_subscriptions').all() as PushSubscriptionRecord[];
}

export const deleteSubscription = (endpoint: string) => {
    db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
}

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
    const insert = db.prepare('INSERT OR IGNORE INTO profiles (handle) VALUES (?)');
    const enable = db.prepare('UPDATE profiles SET is_enabled = 1 WHERE handle = ?');
    
    const tx = db.transaction(() => {
        reset.run();
        handles.forEach(h => {
            const clean = h.trim();
            if (clean) {
                insert.run(clean);
                enable.run(clean);
            }
        });
    });
    tx();
}

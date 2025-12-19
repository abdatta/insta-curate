import db from './db';

export function runMigrations() {
  const schema = `
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      handle TEXT UNIQUE NOT NULL,
      is_enabled INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT,
      finished_at TEXT,
      status TEXT,
      message TEXT
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER,
      profile_handle TEXT,
      post_url TEXT,
      shortcode TEXT,
      posted_at TEXT,
      comment_count INTEGER,
      like_count INTEGER,
      score REAL,
      is_curated INTEGER,
      media_type INTEGER DEFAULT 1,
      caption TEXT,
      accessibility_caption TEXT,
      has_liked INTEGER DEFAULT 0,
      UNIQUE(run_id, post_url),
      FOREIGN KEY(run_id) REFERENCES runs(id)
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT UNIQUE,
      p256dh TEXT,
      auth TEXT,
      created_at TEXT
    );
  `;
  
  db.exec(schema);
  
  try { db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_shortcode ON posts(shortcode)"); } catch (e) {}
  try { db.exec("ALTER TABLE posts ADD COLUMN media_type INTEGER DEFAULT 1"); } catch (e) {}
  try { db.exec("ALTER TABLE posts ADD COLUMN caption TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE posts ADD COLUMN accessibility_caption TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE posts ADD COLUMN has_liked INTEGER DEFAULT 0"); } catch (e) {}
  try { db.exec("ALTER TABLE posts ADD COLUMN username TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE posts ADD COLUMN user_comment TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE posts ADD COLUMN suggested_comments TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE posts ADD COLUMN media_urls TEXT"); } catch (e) {}
  try { db.exec("ALTER TABLE posts ADD COLUMN seen INTEGER DEFAULT 0"); } catch (e) {}
  
  console.log('Migrations run successfully');
}

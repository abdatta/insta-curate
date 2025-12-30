import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { createSqliteGuiApp } from 'sqlite-gui-node';
import { verbose } from 'sqlite3';
import { runMigrations } from './db/migrations';
import { initVapid } from './push/vapid';
import routes from './routes';
import { initScheduler } from './scheduler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const sqlite3 = verbose();
const dbPath = path.join(process.cwd(), 'data', 'app.db');
// Explicitly creating a new sqlite3 connection for the viewer
// because sqlite-gui-node requires a native sqlite3 driver instance
// (driver compatibility with better-sqlite3 is limited for this middleware)
const dbViewer = new sqlite3.Database(dbPath);

// Middleware
app.use(express.json());
// Mount the database viewer
createSqliteGuiApp(dbViewer).then((sqliteGuiApp) => {
  console.log('Database viewer ready.');
  app.use('/db-viewer', sqliteGuiApp);
  app.get('/db-viewer', (_req, res) => {
    /**
     * redirect to /db-viewer/home since the viewer is hard bound to home route
     * and doesn't handle the root path automatically.
     */
    res.redirect('/db-viewer/home');
  });
});
app.use(express.static(path.join(process.cwd(), 'client/dist')));

// Routes
app.use('/api', routes);

// Init
async function start() {
  try {
    // 1. Database
    runMigrations();
    console.log('Database ready.');

    // 1.1 Cleanup stuck runs
    await import('./db/repo').then((r) => r.failStuckRuns());

    // 1.5 Push
    initVapid();
    console.log('VAPID ready.');

    // 2. Scheduler
    initScheduler();
    console.log('Scheduler ready.');

    // 3. Server
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();

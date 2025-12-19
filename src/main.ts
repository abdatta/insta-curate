import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { runMigrations } from './db/migrations';
import { initScheduler } from './scheduler';
import { initVapid } from './push/vapid';
import routes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'client/dist')));

// Routes
app.use('/api', routes);

import { TASK_INITIALIZING, TASK_DONE } from './constants';
app.get('/constants.js', (_req, res) => {
  res.type('application/javascript');
  res.send(`const TASK_INITIALIZING = "${TASK_INITIALIZING}";
const TASK_DONE = "${TASK_DONE}";`);
});

// Init
async function start() {
  try {
    // 1. Database
    runMigrations();
    console.log('Database ready.');
    
    // 1.1 Cleanup stuck runs
    await import('./db/repo').then(r => r.failStuckRuns());

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

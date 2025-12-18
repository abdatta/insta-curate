import express from 'express';
import path from 'path';
import { 
  getCuratedPosts, 
  getLatestRun, 
  createRun, 
  completeRun,
  getSetting, 
  setSetting, 
  upsertProfiles, 
  getAllProfiles,
  saveSubscription 
} from './db/repo';
import { runCuration } from './curator/runCuration';
import { getVapidPublicKey } from './push/vapid';
import { scheduleNextRun } from './scheduler';

const router = express.Router();

// GET /api/curated/latest
router.get('/curated/latest', (req, res) => {
  const run = getLatestRun();
  if (!run) {
    return res.json({ run: null, posts: [] });
  }
  const posts = getCuratedPosts(run.id);
  res.json({ run, posts });
});

// POST /api/admin/run
router.post('/admin/run', async (req, res) => {
  // Check if running?
  const latest = getLatestRun();
  if (latest && latest.status === 'running') {
      // Check if it's stale (e.g. > 1 hour)? For now just block.
      // Or just return existing run id status.
      return res.status(409).json({ message: 'Run already in progress', runId: latest.id });
  }
  
  // Trigger async
  // We don't want to wait for it in the request.
  // But request wants run id.
  // runCuration creates the run.
  // We can't easily get the ID back if we fire and forget unless we change architecture.
  // Let's call runCuration in background but we need to know it started well.
  // Actually runCuration is async.
  
  // Simplification: just return success and let client poll status.
  // But current runCuration saves run *inside* function. 
  // Let's just fire and forget.
  
  runCuration();
  
  res.json({ message: 'Curation started' });
});

// GET /api/admin/status
router.get('/admin/status', (req, res) => {
  const run = getLatestRun();
  res.json({ 
    running: run?.status === 'running',
    lastRun: run
  });
});

// GET /api/admin/settings
router.get('/admin/settings', (req, res) => {
  res.json({
    schedule_enabled: getSetting('schedule_enabled') === 'true',
    schedule_interval_hours: parseInt(getSetting('schedule_interval_hours') || '12'),
  });
});

// POST /api/admin/settings
router.post('/admin/settings', (req, res) => {
  const { schedule_enabled, schedule_interval_hours } = req.body;
  
  if (typeof schedule_enabled === 'boolean') {
      setSetting('schedule_enabled', String(schedule_enabled));
  }
  if (schedule_interval_hours) {
      setSetting('schedule_interval_hours', String(schedule_interval_hours));
  }
  
  // Refresh scheduler
  scheduleNextRun();
  
  res.json({ success: true });
});

// GET /api/admin/profiles
router.get('/admin/profiles', (req, res) => {
  const profiles = getAllProfiles();
  // Return simple text list for UI textarea? Or Objects?
  // UI wants objects probably, but "textarea newline separated" implies strings.
  // Let's return objects and client formats.
  res.json({ profiles });
});

// POST /api/admin/profiles
router.post('/admin/profiles', (req, res) => {
  const { handles } = req.body; // array of strings
  if (Array.isArray(handles)) {
      // Sync
      const { syncProfiles } = require('./db/repo'); // Lazy import if needed or just use import
      syncProfiles(handles);
      res.json({ success: true });
  } else {
      res.status(400).json({ error: 'Invalid handles' });
  }
});

// POST /api/push/subscribe
router.post('/push/subscribe', (req, res) => {
  const subscription = req.body;
  saveSubscription(subscription);
  res.status(201).json({});
});

// GET /api/push/vapidPublicKey
router.get('/push/vapidPublicKey', (req, res) => {
  const key = getVapidPublicKey();
  res.json({ publicKey: key });
});

export default router;

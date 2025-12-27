import express from 'express';
import { 
  getCuratedPosts, 
  getAllCuratedPosts,
  getLatestRun, 
  getLatestSuccessfulRun,
  createRun, 
  completeRun,
  getSetting, 
  setSetting, 
  upsertProfiles, 
  getAllProfiles,
  addProfile,
  deleteProfile,
  setProfileEnabled,
  saveSubscription,
  updatePostComment,
  updatePostLikeStatus
} from './db/repo';
import { runCuration } from './curator/runCuration';
import { getVapidPublicKey } from './push/vapid';
import { scheduleNextRun } from './scheduler';

const router = express.Router();

// GET /api/curated/latest
router.get('/curated/latest', (req, res) => {
  const lastRun = getLatestRun();
  const successfulRun = getLatestSuccessfulRun();
  
  const posts = getAllCuratedPosts();
  
  res.json({ 
      run: lastRun, 
      latestSuccessfulRunId: successfulRun?.id,
      posts 
  });
});

// POST /api/posts/:shortcode/comment
router.post('/posts/:shortcode/comment', async (req, res) => {
    const { shortcode } = req.params;
    const { comment } = req.body;
    
    if (!comment || typeof comment !== 'string') {
        return res.status(400).json({ error: 'Comment required' });
    }
    
    try {
        const { publishCommentToInstagram } = await import('./curator/commenter');
        await publishCommentToInstagram(shortcode, comment);

        updatePostComment(shortcode, comment);
        updatePostLikeStatus(shortcode, true);
        res.json({ success: true, shortcode });
    } catch (e: any) {
        console.error('Failed to post comment:', e);
        res.status(500).json({ error: e.message || 'Failed to post comment to Instagram' });
    }
});

// PATCH /api/posts/:shortcode/seen
router.patch('/posts/:shortcode/seen', (req, res) => {
    const { shortcode } = req.params;
    const { seen } = req.body;
    
    if (typeof seen !== 'boolean') {
        return res.status(400).json({ error: 'Seen status required (boolean)' });
    }
    
    try {
        const { updatePostSeenStatus } = require('./db/repo');
        updatePostSeenStatus(shortcode, seen);
        res.json({ success: true, shortcode, seen });
    } catch (e: any) {
        console.error('Failed to update seen status:', e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/posts/:shortcode/generate-comments
router.post('/posts/:shortcode/generate-comments', async (req, res) => {
    const { shortcode } = req.params;
    const { context } = req.body;
    
    // Import here to avoid circular dependencies if any, or just lazily load service
    const { getPostByShortcode, updatePostSuggestionsAndScore } = await import('./db/repo');
    const { OpenAIService } = await import('./services/ai');
    
    try {
        const post = getPostByShortcode(shortcode);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        // Post is now type `Post` with clean fields
        const mediaUrls = post.mediaUrls || [];
        
        const ai = new OpenAIService();
        const result = await ai.generatePostComments(post.profileHandle, post.caption || '', mediaUrls.slice(0, 10), context);
        
        if (result && result.comments.length > 0) {
            updatePostSuggestionsAndScore(shortcode, result.comments, result.score); 
            res.json({ success: true, comments: result.comments, score: result.score });
        } else {
            res.status(500).json({ error: 'Failed to generate comments' });
        }
    } catch (error: any) {
        console.error('Generation error:', error);
        res.status(500).json({ error: error.message });
    }
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

// GET /api/admin/progress
router.get('/admin/progress', async (req, res) => {
    const { getProgress } = await import('./curator/progress');
    res.json(getProgress());
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
router.post('/api/admin/profiles', (req, res) => {
  // Keeping this for backward compatibility if needed, or remove? 
  // Plan says remove "Save Profiles" button. But let's keep it harmless or redirect to new logic? 
  // It's safer to leave it or update it to use new logic if the client still calls it during transition.
  // Actually, let's REPLACE the mass sync with the new endpoints in the client.
  // But for the router, I'll add the new ones.
  const { handles } = req.body; // array of strings
  if (Array.isArray(handles)) {
      const { syncProfiles } = require('./db/repo'); 
      syncProfiles(handles);
      res.json({ success: true });
  } else {
      res.status(400).json({ error: 'Invalid handles' });
  }
});

// POST /api/admin/profiles/add
router.post('/admin/profiles/add', (req, res) => {
    const { handle } = req.body;
    if (typeof handle === 'string' && handle.trim().length > 0) {
        addProfile(handle);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Invalid handle' });
    }
});

// DELETE /api/admin/profiles/:handle
router.delete('/admin/profiles/:handle', (req, res) => {
    const { handle } = req.params;
    deleteProfile(handle);
    res.json({ success: true });
});

// PATCH /api/admin/profiles/:handle/toggle
router.patch('/admin/profiles/:handle/toggle', (req, res) => {
    const { handle } = req.params;
    const { enabled } = req.body;
    if (typeof enabled === 'boolean') {
        setProfileEnabled(handle, enabled);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: 'Invalid enabled status' });
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

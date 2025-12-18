import { getContext } from './auth';
import { scrapeProfile, PostData } from './scrapeProfile';
import * as repo from '../db/repo';
import { sendPushNotification } from '../push/send';
import fs from 'fs';

// Config
const MAX_POSTS_PER_PROFILE = 5;
const MAX_GLOBAL_POSTS = 30;
const LOOKBACK_HOURS = 24;
const MIN_COMMENTS = 3;

function calculateScore(post: PostData): number {
  if (!post.postedAt) return 0;
  const posted = new Date(post.postedAt);
  const now = new Date();
  const hoursAgo = (now.getTime() - posted.getTime()) / (1000 * 60 * 60);
  
  // Criteria check
  if (hoursAgo > LOOKBACK_HOURS) return 0;
  if (post.commentCount < MIN_COMMENTS) return 0;

  const likes = post.likeCount || 0;
  const comments = post.commentCount;
  
  const engagement = 2 * Math.log(1 + comments) + (likes ? Math.log(1 + likes) : 0);
  const recency = Math.max(0, 1 - hoursAgo / 24);
  
  return engagement * (0.7 + 0.9 * recency);
}

export async function runCuration() {
  const runId = repo.createRun();
  console.log(`Starting run ${runId}`);

  let browser;
  try {
    const { context, browser: b } = await getContext();
    browser = b;
    const page = await context.newPage();

    const profiles = repo.getProfiles().filter(p => p.is_enabled);
    console.log(`Curating for ${profiles.length} profiles`);

    let allCandidates: (PostData & { url: string; handle: string; score: number })[] = [];

    for (const profile of profiles) {
      const posts = await scrapeProfile(page, profile.handle);
      
      // Jitter delay
      await page.waitForTimeout(1000 + Math.random() * 2000);

      // Process posts directly
      for (const post of posts) {
        if (post.postedAt) {
          const score = calculateScore(post);
          if (score > 0) {
            allCandidates.push({
              ...post,
              url: `https://www.instagram.com/p/${post.shortcode}/`,
              handle: profile.handle,
              score
            });
          }
        }
      }
    }

    // Sort and Select
    allCandidates.sort((a, b) => b.score - a.score);

    // Filter per profile cap
    const selected: typeof allCandidates = [];
    const countPerProfile: Record<string, number> = {};
    
    for (const post of allCandidates) {
      if ((countPerProfile[post.handle] || 0) < MAX_POSTS_PER_PROFILE) {
        selected.push(post);
        countPerProfile[post.handle] = (countPerProfile[post.handle] || 0) + 1;
      }
    }

    // Filter global cap
    const finalSelection = selected.slice(0, MAX_GLOBAL_POSTS);

    // Save to DB
    const dbPosts = finalSelection.map(p => ({
      run_id: runId,
      profile_handle: p.handle,
      post_url: p.url,
      shortcode: p.shortcode,
      posted_at: p.postedAt!,
      comment_count: p.commentCount,
      like_count: p.likeCount,
      score: p.score,
      is_curated: 1,
      media_type: p.mediaType,
      caption: p.caption,
      accessibility_caption: p.accessibilityCaption,
      has_liked: p.hasLiked ? 1 : 0,
      username: p.username
    }));
    
    // Also save candidates that were not selected? Maybe just selected ones for now to keep DB small.
    // The prompt says "Store results". We'll store selected.
    repo.savePosts(dbPosts);
    repo.completeRun(runId, 'success', `Curated ${finalSelection.length} posts`);

    console.log(`Run ${runId} complete. ${finalSelection.length} posts curated.`);
    
    // Notify
    try {
        await sendPushNotification({
            title: 'Curation finished',
            body: `Success: ${finalSelection.length} curated posts`,
            url: '/'
        });
    } catch (e) {
        console.error('Failed to send push', e);
    }

  } catch (err: any) {
    console.error('Curation failed:', err);
    repo.completeRun(runId, 'failed', err.message);
    
    try {
        await sendPushNotification({
            title: 'Curation Failed',
            body: err.message || 'Unknown error',
            url: '/'
        });
    } catch (e) {}

  } finally {
    if (browser) await browser.close();
  }
}

// CLI entry point
if (require.main === module) {
  runCuration();
}

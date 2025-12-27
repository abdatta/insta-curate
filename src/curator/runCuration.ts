import { getContext } from './auth';
import { TASK_INITIALIZING, TASK_DONE } from '@shared/constants';
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

  // INIT PROGRESS
  const allProfiles = repo.getProfiles();
  const enabledProfiles = allProfiles.filter(p => p.is_enabled);
  
  // We want to show even disabled ones? Or just enabled? 
  // Let's just track enabled ones for now to be less confusing.
  const taskHandles = [TASK_INITIALIZING, ...enabledProfiles.map(x => x.handle), TASK_DONE];
  import('./progress').then(p => p.initProgress(taskHandles));

  let browser;
  try {
    const { context, browser: b } = await getContext();
    browser = b;
    const page = await context.newPage();

    console.log(`Curating for ${enabledProfiles.length} profiles`);
    const progress = await import('./progress');
    
    // Mark Initializing done
    progress.updateTaskStatus(TASK_INITIALIZING, 'done');

    let allCandidates: (PostData & { url: string; handle: string; score: number })[] = [];

    const aiPromises: Promise<void>[] = [];
    const ai = new (await import('../services/ai')).OpenAIService();

    for (const profile of enabledProfiles) {
      // START TASK
      progress.updateTaskStatus(profile.handle, 'processing');
      
      try {
        // Synchronous Scraping (Browser context is unique/single-threaded for this tab)
        const posts = await scrapeProfile(page, profile.handle);
        
        // Jitter delay (Scraping interval)
        await page.waitForTimeout(1000 + Math.random() * 2000);

        let profileCandidateCount = 0;
        const profileCandidates: (PostData & { url: string; handle: string; score: number; suggestedComments?: string[] })[] = [];

        // Identify candidates immediately
        for (const post of posts) {
            if (post.postedAt) {
                const score = calculateScore(post);
                if (score > 0) {
                    const candidate = {
                        ...post,
                        url: `https://www.instagram.com/p/${post.shortcode}/`,
                        handle: profile.handle,
                        score
                    };
                    allCandidates.push(candidate);
                    profileCandidates.push(candidate);
                    profileCandidateCount++;
                }
            }
        }

        // Async AI Processing
        const aiTask = async () => {
            try {
                // Filter for "Unliked" AND ("Image" OR "Carousel")
                // AND not seen
                // AND no suggestions yet
                const aiTargets = profileCandidates.filter(p => 
                    !p.hasLiked && 
                    (p.mediaType === 1 || p.mediaType === 8) &&
                    !p.seen &&
                    (!p.suggestedComments || p.suggestedComments.length === 0)
                );

                if (aiTargets.length > 0) {
                     console.log(`Generating comments for ${aiTargets.length} posts for ${profile.handle}...`);
                     // Process sequentially per profile to avoid rate limits? Or parallel? 
                     // Let's do sequential for now to be safe with OpenAI rate limits, or Promise.all if we are bold.
                     // User said "while we fetch AI response... we can start scraping images for next profile."
                     // So parallel to scraping is key. Inside, we can go parallel too.
                     
                     await Promise.all(aiTargets.map(async (p) => {
                         const mediaUrls = p.mediaUrls.slice(0, 5); // Max 5 images
                         const aiRes = await ai.generatePostComments(p.handle, p.caption || '', mediaUrls);
                         if (aiRes && aiRes.comments.length > 0) {
                             p.suggestedComments = aiRes.comments;
                             p.aiScore = aiRes.score;
                         }
                     }));
                }
                
                // Mark done only when AI is done
                progress.updateTaskStatus(profile.handle, 'done', `Found ${profileCandidateCount} candidates`);
            } catch (err: any) {
                console.error(`AI gen failed for ${profile.handle}`, err);
                progress.updateTaskStatus(profile.handle, 'done', `Found ${profileCandidateCount} candidates (AI partial fail)`);
            }
        };

        // Fire and forget (track promise)
        aiPromises.push(aiTask());

      } catch (err: any) {
          console.error(`Failed to scrape ${profile.handle}`, err);
          progress.updateTaskStatus(profile.handle, 'failed', err.message);
      }
    }

    // Wait for all AI tasks to drain before saving
    if (aiPromises.length > 0) {
        console.log('Waiting for AI tasks to complete...');
        await Promise.all(aiPromises);
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
      runId: runId,
      profileHandle: p.handle,
      postUrl: p.url,
      shortcode: p.shortcode,
      postedAt: p.postedAt ? new Date(p.postedAt) : new Date(),
      commentCount: p.commentCount,
      likeCount: p.likeCount,
      score: p.score,
      isCurated: true,
      mediaType: p.mediaType as repo.MediaType,
      caption: p.caption,
      accessibilityCaption: p.accessibilityCaption,
      hasLiked: p.hasLiked,
      username: p.username,
      userComment: null,
      suggestedComments: p.suggestedComments || [],
      mediaUrls: p.mediaUrls || [],
      seen: p.seen || false
    } as repo.Post));
    
    progress.updateTaskStatus(TASK_DONE, 'processing');

    repo.savePosts(dbPosts);
    repo.completeRun(runId, 'success', `Curated ${finalSelection.length} posts`);

    console.log(`Run ${runId} complete. ${finalSelection.length} posts curated.`);

    // UPDATE PROGRESS FINAL
    progress.incrementCuratedCount(finalSelection.length);
    progress.updateTaskStatus(TASK_DONE, 'done');
    progress.completeProgress();
    
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
    
    import('./progress').then(p => p.completeProgress(err.message));

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

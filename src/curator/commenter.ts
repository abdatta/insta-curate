import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { STORAGE_STATE_PATH } from './auth';

export async function publishCommentToInstagram(
  shortcode: string,
  commentText: string
): Promise<void> {
  console.log(`[Commenter] Starting comment flow for ${shortcode}`);

  const hasStorage = fs.existsSync(STORAGE_STATE_PATH);
  if (!hasStorage) {
    throw new Error('No session found. Please login first via admin.');
  }

  // Launch visible browser as requested ("high visibility act")
  const browser = await chromium.launch({ headless: true, slowMo: 100 }); // slowMo for visibility
  const context = await browser.newContext({
    storageState: STORAGE_STATE_PATH,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  try {
    const url = `https://www.instagram.com/p/${shortcode}/`;
    console.log(`[Commenter] Navigating to ${url}`);
    await page.goto(url);

    // Check if we are logged in (look for generic logged in element, e.g. profile link or heart icon)
    // If "Log In" button is visible, we failed.
    const loginButton = page.locator('a[href="/accounts/login/"]');
    if (
      (await loginButton.count()) > 0 &&
      (await loginButton.first().isVisible())
    ) {
      throw new Error('Session expired or invalid. Please re-login.');
    }

    // 1. Like the post (Ack)
    console.log('[Commenter] Attempting to like post...');
    // Selector for Like button (unliked state usually has aria-label="Like" or "Like")
    // Instagram SVG: aria-label="Like" -> parent
    const container = 'div[data-visualcompletion="ignore-dynamic"]';
    const likeBtn = page.locator(`${container} svg[aria-label="Like"]`).first();

    // Wait until either the Like or Unlike button is visible
    await page
      .locator(
        `${container} svg[aria-label="Like"], ${container} svg[aria-label="Unlike"]`
      )
      .first()
      .waitFor({ state: 'visible' });

    if (await likeBtn.isVisible()) {
      await likeBtn.locator('xpath=..').click();
      console.log('[Commenter] Liked.');
      await page.waitForTimeout(1000); // Wait for animation
    } else {
      console.log('[Commenter] Already liked.');
    }

    // 2. Type Comment
    console.log('[Commenter] Finding comment box...');
    // Try common selectors
    const textarea = page
      .locator('textarea[aria-label="Add a comment…"]')
      .or(page.locator('form textarea'));
    if ((await textarea.count()) === 0) {
      throw new Error(
        'Could not find comment text area. Is the post restricted?'
      );
    }

    await textarea.first().click();
    await textarea.first().fill(commentText);
    await page.waitForTimeout(500);

    // 3. Post
    console.log('[Commenter] Posting...');
    const postButton = page
      .locator('div[role="button"]')
      .filter({ hasText: 'Post' });

    // Sometimes the Post button is disabled until text is typed.
    if ((await postButton.count()) > 0) {
      await postButton.click();
    } else {
      // Fallback: form submit? usually hitting enter doesn't work well in these rich editors, need button
      throw new Error('Could not find Post button.');
    }

    // 4. Verify
    // Listen for "Posting..." to disappear or the comment to appear?
    // Usually, the text area clears.
    console.log('[Commenter] Verifying...');
    await page.waitForFunction(
      () => {
        const el = document.querySelector(
          'textarea[aria-label="Add a comment…"]'
        ) as HTMLTextAreaElement;
        return el && el.value === '';
      },
      null,
      { timeout: 10000 }
    );

    console.log('[Commenter] Comment posted successfully (Input cleared).');
    await page.waitForTimeout(2000); // Show off the result a bit
  } catch (e) {
    console.error('[Commenter] Failed:', e);
    // Take screenshot
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = path.join(
        process.cwd(),
        'data',
        'screenshots',
        `error-${timestamp}-${shortcode}.png`
      );
      await page.screenshot({ path: screenshotPath });
      console.log(`[Commenter] Screenshot saved to ${screenshotPath}`);
    } catch (err) {
      console.error('[Commenter] Failed to take screenshot:', err);
    }
    throw e;
  } finally {
    await browser.close();
  }
}

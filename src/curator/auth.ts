import { chromium, BrowserContext, Page } from 'playwright';
import path from 'path';
import fs from 'fs';

const STORAGE_STATE_PATH = path.join(process.cwd(), 'data', 'storageState.json');

export async function getContext(): Promise<{ context: BrowserContext; browser: any }> {
  // If storage state exists, use it
  const hasStorage = fs.existsSync(STORAGE_STATE_PATH);
  
  // We use headless: true for curation, but false for login
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(
    hasStorage ? { storageState: STORAGE_STATE_PATH, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } : { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
  );
  
  return { context, browser };
}

export async function loginInteractive() {
  console.log('Launching browser for login...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  // Load existing state if any, to see if we are already logged in
  if (fs.existsSync(STORAGE_STATE_PATH)) {
      // Actually newContext doesn't merge, we should read it manually or just let user overwrite
      // But creating context with storageState is easier.
      // Let's just start fresh or load? The user might want to re-login.
      // We'll proceed with clean context for manual login unless they are just refreshing.
      // Let's keep it simple: fresh login.
  }

  const page = await context.newPage();
  await page.goto('https://www.instagram.com/');

  console.log('Please log in manually in the browser window.');
  console.log('Once logged in and on the feed, press Enter here to save session.');

  // Wait for user input on stdin
  await new Promise<void>(resolve => {
    process.stdin.resume();
    process.stdin.once('data', () => resolve());
  });

  await context.storageState({ path: STORAGE_STATE_PATH });
  console.log('Session saved to', STORAGE_STATE_PATH);
  
  await browser.close();
  process.exit(0);
}

// Execute login if run directly
if (require.main === module) {
  loginInteractive();
}

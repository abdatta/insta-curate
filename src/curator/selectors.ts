export const SELECTORS = {
  // Login
  LOGIN_USERNAME: 'input[name="username"]',
  LOGIN_PASSWORD: 'input[name="password"]',
  LOGIN_SUBMIT: 'button[type="submit"]',

  // Profile
  POST_GRID_ITEM: 'article a[href^="/p/"]',

  // Post Detail
  TIME_ELEMENT: 'time[datetime]', // Standard ISO time
  COMMENT_COUNT_LABEL: 'ul > li span', // Fallback, often hard.
  // Better approach for comments: look for "View all X comments" button or use meta tags?
  // Meta tags in head are often reliable even if SPA.
  // Or look for specific Aria labels.

  // Dialogs
  CLOSE_MODAL: '[aria-label="Close"]',
  NOT_NOW_BUTTON: '//button[text()="Not Now"]',
};

// Utils for parsing
export function parseCount(str: string | null | undefined): number {
  if (!str) return 0;
  // handle "1,234", "1.2K", "1M"
  let clean = str.replace(/,/g, '').trim().toUpperCase();
  let multiplier = 1;
  if (clean.endsWith('K')) {
    multiplier = 1000;
    clean = clean.slice(0, -1);
  } else if (clean.endsWith('M')) {
    multiplier = 1000000;
    clean = clean.slice(0, -1);
  }
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val * multiplier;
}

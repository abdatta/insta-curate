# State of the World

> Last Updated: 2025-12-17

## Capabilities (What Works)

- **Login**: Auth state persists via `data/storageState.json`. Manual login flow exists if cookie expires.
- **Scraping**: Robust **Network Interception** captures full post metadata (Likes, Comments, Caption, Media Type).
- **Curation Algorithm**:
    - Favorites high comments.
    - Penalizes posts older than 24h.
    - Limits: Max 5 posts per profile, Max 30 posts per run.
- **Notifications**: VAPID Push notifications work on Desktop/Android (iOS requires PWA install).
- **Resilience**: Server auto-cleans "stuck" runs on restart.

## Known Limitations / Risks

1.  **Anti-Scraping**: Instagram changes selectors and API structures frequently. If `graphql/query` endpoint changes, `scrapeProfile.ts` will break.
2.  **Session Expiry**: User must manually re-auth via terminal/GUI execution if the `storageState` becomes invalid. No automated re-login UI in PWA yet.
3.  **Rate Limits**: Aggressive scraping will trigger IG soft-bans (301 redirects to login).

## Roadmap

- [ ] **Multi-User**: Support multiple distinct Instagram "viewer" accounts? (Low priority).
- [ ] **UI Refinement**: "Swipe" interface for curated posts?
- [ ] **Backup**: Export database/settings to JSON.

## Tech Debt / Code Health

- **`scrapeProfile.ts`**: The PostData type definition is manual. Should ideally be generated from a schema, but IG's schema is private/undocumented.
- **Frontend**: `app.js` is a single large file (~200 lines). Might need splitting if it grows.

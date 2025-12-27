# State of the World

> Last Updated: 2025-12-19

## Capabilities (What Works)

- **Login**: Auth state persists via `data/storageState.json`. Manual login flow exists if cookie expires.
- **Scraping**: Robust **Network Interception** captures full post metadata.
    - Captures: Shortcode, Caption, Media Type (Image/Video/Carousel), Likes, Comments, Timestamp.
    - **High-Res Extraction**: Prioritizes `image_versions2` candidates for best quality.
- **Curation Algorithm**:
    - Favorites high comments.
    - Penalizes posts older than 24h.
    - Limits: Max 5 posts per profile, Max 30 posts per run.
- **Automation**:
    - **Commenting**: Playwright-based automation that **Likes** and **Comments** on posts via a visible browser session (`headless: false`, `slowMo`).
    - **Error Handling**: Captures screenshots of failures to `data/screenshots` and alerts the UI.
    - **AI Engine**: Enhanced `gpt-5-nano` prompt that treats Media + Caption + Profile Handle as a single context. Explicitly detects memes for witty reactions vs aesthetic observations for regular posts.
- **Admin UI**:
    - **Comment Flow**: Supports AI suggestion review with **Context Input**, manual editing, and automated posting. Features a spinner overlay and "premium" saved state.
    - **Smart Scoring**: Displays AI-generated **Commentability Score (0-10)** based on persona fit.
    - **Refined AI**: Prompt structured for a specific 30yo femme persona, avoiding generic phrases.
    - **Sorting**: Feed sorted by **Instagram Posted Date**.
    - **Optimized Layout**: Compact footer stats and refined density.
    - **UI**: Regenerate button, row-based layout for easy reading.
- **History View**:
    - Full curation history grouped by runs with dividers.
    - Intelligent relative timestamps (Relative for <1 week, absolute thereafter).
    - **Frontend**: Vite + Preact + TypeScript PWA.
    - **Progress UI**: Real-time visualization of curation tasks.
    - **Run Control**: Manual trigger via UI.
    - **Offline Capable**: Service Worker caching with smart **Auto-Updates** (reloads on new build unless busy).
    - **Status badges** (New/Late/Old/Seen) and auto-collapse for processed posts.
    - **Granular Profile Management**: Add, delete, and toggle individual profiles.
    - **Architecture**:
        - **Shared Types**: Single source of truth (`shared/types.ts`) for Client/Server API contracts.
        - **Type Safety**: Full camelCase mapping and strict Type handling across DB and UI.

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
- **Testing**: Added initial backend tests, but frontend interactions (especially `PostCard` logic) need more coverage.

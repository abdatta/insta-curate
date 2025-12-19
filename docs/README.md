# System Overview

**Product**: `insta-curate` is a self-hosted curator that logs into your Instagram, scans specific "quality" profiles, and extracts the highest-signal posts for you to view in a quiet, ad-free PWA.

## High-Level Architecture

```
[ Instagram ] <--- (Playwright Browser) ---> [ Node.js Server ] <---> [ SQLite DB ]
                                                    ^
                                                    | (API / JSON)
                                                    v
                                            [ PWA Frontend ]
                                            (Service Worker)
```

## Major Subsystems

1.  **The Curator (`src/curator/`)**
    - **Engine**: Playwright (Headless Chromium).
    - **Strategy**: Logs in using saved storage state. Navigates to profile pages. Intercepts `graphql/query` network responses to get raw post data.
    - **Scoring**: Calculus of `Like Count`, `Comment Count`, and `Recency` (Exponential decay).

2.  **The Server (`src/main.ts`, `src/routes.ts`)**
    - **Tech**: Express.js.
    - **role**: Serves the PWA static files, provides JSON API for profiles/posts/settings, handles Push Subscription management.

3.  **The Database (`src/db/`)**
    - **Tech**: `better-sqlite3`.
    - **Schema**:
        - `settings`: Key-value store.
        - `profiles`: Target handles to scrape.
        - `runs`: Audit log of executions.
        - `posts`: The curated content (normalized, includes `user_comment`).
        - `push_subscriptions`: VAPID endpoints for notifications.

4.  **The Frontend (`client/`)**
    - **Tech**: Vite, Preact, TypeScript, CSS Modules (Tokens).
    - **Capabilities**: Installable PWA (Offline + Push), Modern reactive UI, Dark Mode.
    - **Build**: `npm run build` outputs to `client/dist`, served by Express.

## Data Flow

1.  **Trigger**: User clicks "Run Now" OR Scheduler fires.
2.  **Scrape**: Browser opens -> Login check -> Visit Profiles -> Intercept JSON.
3.  **Process**: Filter posts by date -> Calculate Score -> Select top N posts per profile -> Select top M global posts.
4.  **Store**: Save to `posts` table (UPSERT).
5.  **Notify**: Send Web Push to all subscribed clients.
6.  **Review**: User opens PWA -> Views "New" posts -> Selects/Edits AI suggestion -> Clicks "Post" (Saves locally).

# AI Agent Entry Point

> **Read this first.** This file defines the context, goals, and rules for working on the `insta-curate` repository.

## 1. North Star & Constraints

**Goal**: Build a personal, locally-hosted tool to curate high-quality Instagram posts from a specific list of profiles, filtering out noise so the user can see only the "best" content (high engagement/recency) without doom-scrolling.

**Constraints & Non-Goals**:
- **NOT a SaaS**: Use local storage (SQLite), local execution (Playwright on dev machine/server). No multi-tenancy.
- **NOT an aggressive bot**: scraping is passive (reading timeline), low volume, and read-only. **Writing (Likes/Comments)** is user-initiated and rate-limited by manual speed.
- **Visuals Matter**: The Admin UI for the user needs to be aesthetic (Vanilla CSS, "Premium" feel).

## 2. Current State (as of Dec 2025)

- **Scraper**: Functional. Uses **Network Interception** (Playwright `waitForResponse`) to capture `graphql/query` JSON responses.
    - Captures: Shortcode, Caption, Media Type (Image/Video/Carousel), Likes, Comments, Timestamp.
- **Curation**: Implemented. Score = `engagement * recency_decay`. Sorts by `posted_at DESC`.
    - **Admin UI**:
    - **Comment Flow**: AI suggestion review with **Context Input**, manual editing, and **Automated Posting**.
    - **AI Engine**: **Persona-driven** (30yo LA creator) generation with **Commentability Score (0-10)** and "soft-glow" vibe. Explicitly avoids generic phrases.
    - **History**: Grouped history view with status badges (Blue=New, Orange=Late, Grey=Old).
- **Database**: SQLite (`data/app.db`) with `posts`, `runs`, `profiles`, `settings`, `push_subscriptions` tables.
- **Notifications**: Web Push (VAPID) enabled with **PWA Permission Toggle**. Sends alerts on run completion (with new post counts).
- **Frontend**: Vite + Preact + TypeScript PWA. Uses **Shared Types** for strict API contracts. Lists curated posts, allows manual triggering of runs (with progress UI), and supports comment approval workflow.

**Known Issues**:
- Instagram might prompt for login or challenge occasionally (handled via `auth.ts` manual login flow).
- **Headless Mode**: Curation runs in `headless: true`. Manual login requires temporarily switching to `false` in `auth.ts` if needed, though current logic persists state well.

## 3. How to Run

```bash
# Install
npm install

# Run (Server + Scheduler + Watch mode)
npm run dev

# Build
npm run build
```

**Key Commands**:
- `npm run dev`: Starts the Backend (Express) and Frontend (Vite) concurrently.
- `npx playwright test`: (If tests are added later).

## 4. Agent Rules of Engagement

1.  **Do NOT refactor to DOM scraping**: We explicitly moved TO network interception. Do not revert this without strong evidence.
2.  **Schema Changes**: Always use `db/migrations.ts`. Check `try...catch` blocks for column additions to support existing DBs.
3.  **Dependency Discipline**: Do not add large framework dependencies (e.g. Next.js, full React) unnecessarily. We use **Preact** for the PWA to balance component architecture with lightweight footprint.
4.  **Shared Contracts**: ALWAYS use `shared/types.ts` for data structures exchanged between Client and Server. Do not duplicate interfaces.
5.  **Artifacts**: Update `docs/STATE.md` if you add a major feature.

## 5. Navigation

- **[System Overview](docs/README.md)**: Architecture and subsystems.
- **[Current Reality](docs/STATE.md)**: Detailed feature status and roadmap.
- **[Code Map](docs/CODEBASE_MAP.md)**: Where logic lives.
- **[Glossary](docs/GLOSSARY.md)**: Key terms (`Run`, `Score`, etc.).
- **[Decisions](docs/adr/)**: "Why did we do this?"
- **[Best Practices](docs/BEST_PRACTICES.md)**: Coding standards and commit style.

# ADR-0003: Local Comment Review Flow

## Context
We want the tool to help the user interact with curated posts by suggesting high-quality comments. However, we must ensure the user has final approval over any text and avoid "bot-like" behavior by accidentally posting AI gibberish.

## Decision
We implemented a **Local-First Comment Review Flow**.

1.  AI suggestions are generated (or placeheld) in the UI.
2.  The User can choose a suggestion or write their own.
3.  Clicking "Post" currently only saves the comment to the **local SQLite DB** (`posts.user_comment`).
4.  Actual posting to the Instagram API is deferred as a separate, future implementation.

## Alternatives Considered
- **Direct Auto-Comment**: Rejected. Too risky for account bans and content quality.
- **Copy-to-Clipboard**: Rejected. Adding it to the local DB allows the UI to track which posts have already been "handled" by the user (moving them to the collapsed/history state).

## Consequences
- **Pros**: complete user control, safe for accounts, provides a "history" of what the user intended to say.
- **Cons**: Requires a second step for the actual Instagram post (until the API integration is built).

## References
- `public/app.js` (Comment UI)
- `src/db/repo.ts` (`updatePostComment`)
- `src/routes.ts` (`POST /api/posts/:shortcode/comment`)

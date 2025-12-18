# ADR-0002: Network Interception for Scraping

## Context
We need to extract high-fidelity data from Instagram profiles (likes, dates, comments). DOM Scraping (CSS selectors) is extremely brittle because Instagram uses randomized/obfuscated class names (e.g., `_aagv`).

## Decision
We chose **Network Response Interception** using Playwright's `page.waitForResponse`. We listen for `graphql/query` (or `api/v1/feed/user`) responses which contain clean JSON data.

## Alternatives Considered
- **DOM Scraping**: Rejected. Maintenance nightmare.
- **Unofficial APIs (Instagram-private-api)**: Rejected to avoid account bans; using a real browser context (Playwright) is safer as it mimics real user behavior.

## Consequences
- **Pros**: Access to fields not visible in UI (exact timestamp, media IDs). Stable structure (API changes less often than CSS).
- **Cons**: Dependencies on specific API endpoint signatures (`graphql/query`). If IG switches to websockets or encoded protobufs, this will break.

## References
- `src/curator/scrapeProfile.ts`

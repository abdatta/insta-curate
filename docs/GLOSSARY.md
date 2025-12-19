# Glossary

| Term | Definition | Context |
| :--- | :--- | :--- |
| **Run** | A single execution session where the curator checks all enabled profiles. Has a `run_id`. | `src/curator/runCuration.ts`, `posts` table |
| **Candidate** | A post found on a profile that meets date criteria but hasn't been scored/selected yet. | `src/curator/scrapeProfile.ts` |
| **PostData** | The normalized shape of a post extracted from IG's GraphQL. | `scrapeProfile.ts` |
| **Score** | A floating point number representing "quality". Calculated as `Engagement * RecencyDecay`. | `calculateScore()` |
| **Shortcode** | Instagram's unique ID for a post (e.g., `DSYKS_HEfC-`). Used in URLs. | `posts.shortcode` |
| **VAPID** | Voluntary Application Server Identification. The protocol used for web push authentication. | `src/push/` |
| **Network Interception** | The technique of listening to HTTP responses in the browser (`page.waitForResponse`) rather than parsing HTML. | `scrapeProfile.ts` |
| **Badge** | UI marker for post freshness: **New** (<24h, Blue), **Late** (24-48h, Orange), **Old** (>48h, Grey). | `client/src/components/PostCard.tsx` |
| **User Comment** | A local draft or approved comment stored in our DB before actually being posted to IG. | `posts.user_comment` |
| **Structured Output** | OpenAI feature ensuring JSON responses strictly follow a defined Schema. | `src/services/ai.ts` |

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
| **Commentability Score** | AI-generated rating (0-10) of how natural/valuable it is for the Persona to comment on a post. | `src/services/ai.ts` |
| **Persona** | The specific identity (30yo LA fitness/lifestyle creator, "soft-glow" vibe) adopted by the AI for comments. | `src/services/ai.ts` |
| **Context** | User-provided text hint to guide the AI's comment generation logic. | `client/src/components/PostCard.tsx` |

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

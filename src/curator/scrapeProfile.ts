import { Page } from 'playwright';

export type PostData = {
  shortcode: string;
  postedAt: string | null;
  commentCount: number;
  likeCount: number | null;
  mediaType: number;
  caption: string | null;
  accessibilityCaption: string | null;
  username: string;
  hasLiked: boolean;
  mediaUrls: string[];
  // Curation Extensions
  seen?: boolean;
  suggestedComments?: string[];
  aiScore?: number;
};

export async function scrapeProfile(
  page: Page,
  handle: string
): Promise<PostData[]> {
  console.log(`Scraping profile (network): ${handle}`);
  const posts: PostData[] = [];

  // Setup response listener
  const responsePromise = page
    .waitForResponse(
      async (response) => {
        const url = response.url();
        // Match GraphQL query for user timeline
        if (
          (url.includes('/graphql/query') ||
            url.includes('/api/v1/feed/user/')) &&
          response.status() === 200
        ) {
          try {
            const json = await response.json();
            const edges =
              json?.data?.xdt_api__v1__feed__user_timeline_graphql_connection
                ?.edges;
            if (Array.isArray(edges)) {
              console.log(`Intercepted ${edges.length} posts from GraphQL`);
              return true;
            }
          } catch (e) {}
        }
        return false;
      },
      { timeout: 15000 }
    )
    .catch(() => null);

  try {
    await page.goto(`https://www.instagram.com/${handle}/`, {
      waitUntil: 'domcontentloaded',
    });

    // Wait for response
    const response = await responsePromise;
    if (response) {
      const json = await response.json();
      const edges =
        json.data.xdt_api__v1__feed__user_timeline_graphql_connection.edges;

      for (const edge of edges) {
        const node = edge.node;
        if (!node) continue;

        // Extract caption safely
        let captionText = null;
        if (node.caption && node.caption.text) {
          captionText = node.caption.text;
        } else if (node.edge_media_to_caption?.edges?.[0]?.node?.text) {
          captionText = node.edge_media_to_caption.edges[0].node.text;
        }

        // Helper to find best image
        const getBestImage = (candidates: any[]) => {
          if (!candidates || candidates.length === 0) return null;
          return candidates.sort(
            (a, b) => b.width * b.height - a.width * a.height
          )[0].url;
        };

        // Extract Media URLs
        const mediaUrls: string[] = [];
        const mediaType = node.media_type || 1;

        if (mediaType === 1 || mediaType === 2) {
          // Image or Video (treat main display_url as thumb for video)
          const best = getBestImage(node.image_versions2?.candidates);
          if (best) mediaUrls.push(best);
          else if (node.display_url) mediaUrls.push(node.display_url);
        } else if (mediaType === 8) {
          // Carousel
          // Try carousel_media first (from xdt response)
          if (node.carousel_media && Array.isArray(node.carousel_media)) {
            for (const item of node.carousel_media) {
              const best = getBestImage(item.image_versions2?.candidates);
              if (best) mediaUrls.push(best);
              else if (item.display_url) mediaUrls.push(item.display_url); // Fallback
            }
          }
          // Fallback to edge_sidecar_to_children (if schema differs)
          else {
            const children = node.edge_sidecar_to_children?.edges;
            if (Array.isArray(children)) {
              for (const child of children) {
                if (child.node) {
                  const best = getBestImage(
                    child.node.image_versions2?.candidates
                  );
                  if (best) mediaUrls.push(best);
                  else if (child.node.display_url)
                    mediaUrls.push(child.node.display_url);
                }
              }
            }
          }
        }

        const postedAt = node.taken_at
          ? new Date(node.taken_at * 1000).toISOString()
          : null;

        // Skip invalid dates (e.g. 1970)
        if (!postedAt || new Date(postedAt).getFullYear() < 2010) {
          console.warn(
            `Skipping post ${node.code} due to invalid date: ${postedAt}`
          );
          continue;
        }

        posts.push({
          shortcode: node.code || node.shortcode,
          postedAt: postedAt,
          commentCount: node.comment_count || 0,
          likeCount: node.like_count || node.edge_liked_by?.count || 0,
          mediaType: mediaType,
          caption: captionText,
          accessibilityCaption: node.accessibility_caption || null,
          username: node.user.username,
          hasLiked: !!node.has_liked,
          mediaUrls,
        });
      }
    } else {
      console.log(`No GraphQL response captured for ${handle}`);
    }
  } catch (err) {
    console.error(`Error scraping profile ${handle}:`, err);
  }

  return posts;
}

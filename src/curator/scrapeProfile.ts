import { Page } from 'playwright';

export type PostData = {
  shortcode: string;
  postedAt: string | null;
  commentCount: number;
  likeCount: number | null;
  mediaType: number;
  caption: string | null;
  accessibilityCaption: string | null;
  username: string | null;
  hasLiked: boolean;
};

export async function scrapeProfile(page: Page, handle: string): Promise<PostData[]> {
  console.log(`Scraping profile (network): ${handle}`);
  const posts: PostData[] = [];

  // Setup response listener
  const responsePromise = page.waitForResponse(async (response) => {
    const url = response.url();
    // Match GraphQL query for user timeline
    if ((url.includes('/graphql/query') || url.includes('/api/v1/feed/user/')) && response.status() === 200) {
      try {
        const json = await response.json();
        const edges = json?.data?.xdt_api__v1__feed__user_timeline_graphql_connection?.edges;
        if (Array.isArray(edges)) {
            console.log(`Intercepted ${edges.length} posts from GraphQL`);
            return true;
        }
      } catch (e) {}
    }
    return false;
  }, { timeout: 15000 }).catch(() => null);

  try {
    await page.goto(`https://www.instagram.com/${handle}/`, { waitUntil: 'domcontentloaded' });
    
    // Wait for response
    const response = await responsePromise;
    if (response) {
        const json = await response.json();
        const edges = json.data.xdt_api__v1__feed__user_timeline_graphql_connection.edges;
        
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

            posts.push({
                shortcode: node.code || node.shortcode,
                postedAt: node.taken_at ? new Date(node.taken_at * 1000).toISOString() : null,
                commentCount: node.comment_count || 0,
                likeCount: node.like_count || node.edge_liked_by?.count || 0,
                mediaType: node.media_type || 1,
                caption: captionText,
                accessibilityCaption: node.accessibility_caption || null,
                username: node.user?.username || null,
                hasLiked: !!node.has_liked
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

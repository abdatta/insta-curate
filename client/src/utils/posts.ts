import type { Post } from '../types';

/**
 * Determines whether a post should start collapsed based on the same logic
 * used by the PostCard component.
 *
 * A post is collapsed by default if it is considered old (48h+), already liked,
 * already commented, or marked as seen.
 */
export function shouldCollapsePost(post: Post, now: number = Date.now()) {
  const postedTime = new Date(post.postedAt).getTime();
  const ageHours = (now - postedTime) / (1000 * 60 * 60);
  const isOld = ageHours >= 48;
  const hasLiked = !!post.hasLiked;
  const hasCommented = !!post.userComment;
  const isSeen = !!post.seen;

  return isOld || hasLiked || hasCommented || isSeen;
}

export function countAutoExpandedPosts(
  posts: Post[],
  now: number = Date.now()
) {
  return posts.reduce(
    (count, post) => count + (shouldCollapsePost(post, now) ? 0 : 1),
    0
  );
}

// Use const object instead of enum to support erasableSyntaxOnly/isolatedModules
export const MediaType = {
  Image: 1,
  Video: 2,
  Carousel: 8,
} as const;

export type MediaType = (typeof MediaType)[keyof typeof MediaType];

// API Response Shape (Data Transfer Object)
export interface Post {
  runId: number;
  profileHandle: string;
  postUrl: string;
  shortcode: string;
  postedAt: string; // ISO String in JSON
  commentCount: number;
  likeCount?: number | null;
  score: number;
  aiScore?: number; // 0-10, computed by AI
  isCurated: boolean;
  mediaType: MediaType;
  caption?: string | null;
  accessibilityCaption?: string | null;
  hasLiked: boolean;
  username?: string | null;
  userComment?: string | null;
  suggestedComments?: string[];
  mediaUrls?: string[];
  seen: boolean;

  // Joins
  runDate?: string;
  runStatus?: string;
}

export interface CommentSuggestionResponse {
  comments: string[];
  score: number; // 0-10
}

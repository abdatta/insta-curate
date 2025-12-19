export enum MediaType {
  Image = 1,
  Video = 2,
  Carousel = 8
}

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
  isCurated: boolean;
  mediaType: MediaType;
  caption?: string | null;
  accessibilityCaption?: string | null;
  hasLiked: boolean;
  username?: string | null;
  userComment?: string | null;
  suggestedComments?: string[];
  mediaUrls?: string[];
  
  // Joins
  runDate?: string;
  runStatus?: string;
}

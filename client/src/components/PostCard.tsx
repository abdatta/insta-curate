import { useState } from 'preact/hooks';
import type { Post } from '../types';
import { timeAgo, escapeHtml } from '../utils/formatting';
import { api } from '../services/api';
import '../styles/components/PostCard.css';

interface PostCardProps {
  post: Post;
  rank: number;
  onCommentPosted?: () => void;
}

export function PostCard({ post, rank, onCommentPosted }: PostCardProps) {
  const postedTime = new Date(post.posted_at).getTime();
  const now = new Date().getTime();
  const ageHours = (now - postedTime) / (1000 * 60 * 60);

  // Badges
  let badgeClass = '';
  let badgeText = '';
  let isOld = false;
  if (ageHours < 24) { badgeClass = 'badge-new'; badgeText = 'New'; }
  else if (ageHours < 48) { badgeClass = 'badge-late'; badgeText = 'Late'; }
  else { badgeClass = 'badge-old'; badgeText = 'Old'; isOld = true; }

  const hasLiked = !!post.has_liked;
  const hasCommented = !!post.user_comment;
  
  // Collapsed state
  const [collapsed, setCollapsed] = useState(isOld || hasLiked || hasCommented);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  const toggleCollapsed = () => setCollapsed(!collapsed);

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      await api.postComment(post.shortcode, commentText);
      setCommentText('');
      if (onCommentPosted) onCommentPosted();
    } catch (err) {
      alert('Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  return (
    <article class={`post-card ${collapsed ? 'collapsed' : ''}`}>
      <div class="post-header" onClick={toggleCollapsed}>
        <div class="header-left">
          <span class={`badge ${badgeClass}`}>{badgeText}</span>
          {hasLiked && <span class="badge badge-liked">Liked</span>}
          <span class="post-handle">@{post.profile_handle}</span>
        </div>
        <div class="header-right">
          <span class="post-meta">
            {timeAgo(postedTime)} 
            {post.run_date && ` • ${timeAgo(post.run_date)}`}
          </span>
        </div>
      </div>

      <div class={`collapsible-wrapper ${collapsed ? 'collapsible-hidden' : 'collapsible-visible'}`}>
        <div class="collapsible-content">
          <div class="post-embed">
            <iframe 
              src={`https://www.instagram.com/p/${post.shortcode}/embed`} 
              frameBorder="0" 
              scrolling="no" 
              allowTransparency={true} 
              loading="lazy" 
              class="instagram-iframe"
            />
          </div>

          <div class="post-caption" dangerouslySetInnerHTML={{ __html: post.caption ? escapeHtml(post.caption).replace(/\n/g, '<br>') : '<i>No caption</i>' }} />

          {/* Comment Section */}
          <div class="post-comment-section">
            {hasCommented ? (
              <div class="saved-comment">
                <strong>Your Comment:</strong>
                {post.user_comment}
              </div>
            ) : (
             !hasLiked && !isOld && (
                <div>
                   <div class="suggestion-area">
                     <div class="suggestion-label">Add a comment:</div>
                     <div class="suggestion-buttons">
                       {["Great shot! 📸", "Amazing! 🙌", "Love this! 🔥"].map(s => (
                         <button key={s} class="btn-use" onClick={() => setCommentText(s)}>{s}</button>
                       ))}
                     </div>
                   </div>
                   <div class="comment-input-row">
                      <input 
                        type="text" 
                        class="comment-input" 
                        value={commentText} 
                        onInput={(e) => setCommentText(e.currentTarget.value)}
                        placeholder="Write a comment..." 
                      />
                      <button class="btn-post" disabled={posting || !commentText} onClick={handlePostComment}>
                        {posting ? 'Posting...' : 'Post'}
                      </button>
                   </div>
                </div>
             )
            )}
          </div>

          <div class="post-stats">
            <span>Rank #{rank}</span>
            <span>Score: {post.score.toFixed(2)}</span>
            <span>Comments: {post.comment_count}</span>
            <span>Likes: {post.like_count}</span>
          </div>
          
          <a href={post.post_url || `https://www.instagram.com/p/${post.shortcode}`} target="_blank" class="post-link">Open in Instagram</a>
        </div>
      </div>
    </article>
  );
}

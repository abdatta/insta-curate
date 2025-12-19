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
  const postedTime = new Date(post.postedAt).getTime();
  const now = new Date().getTime();
  const ageHours = (now - postedTime) / (1000 * 60 * 60);

  // Badges
  let badgeClass = '';
  let badgeText = '';
  let isOld = false;
  if (ageHours < 24) { badgeClass = 'badge-new'; badgeText = 'New'; }
  else if (ageHours < 48) { badgeClass = 'badge-late'; badgeText = 'Late'; }
  else { badgeClass = 'badge-old'; badgeText = 'Old'; isOld = true; }

  // Local state for immediate UI updates
  const [localHasLiked, setLocalHasLiked] = useState(!!post.hasLiked);
  const [localUserComment, setLocalUserComment] = useState(post.userComment);
  const [localSeen, setLocalSeen] = useState(!!post.seen);

  const hasLiked = localHasLiked;
  const hasCommented = !!localUserComment;
  const isSeen = localSeen;
  
  // Collapsed state: collapsed if old, liked, commented, OR SEEN
  const [collapsed, setCollapsed] = useState(isOld || hasLiked || hasCommented || isSeen);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(post.suggestedComments || []);

  const toggleCollapsed = () => setCollapsed(!collapsed);

  const toggleSeen = async (e: Event) => {
    e.stopPropagation(); // Don't toggle collapse from the row click
    const newSeen = !isSeen;
    setLocalSeen(newSeen);
    
    try {
        await api.markSeen(post.shortcode, newSeen);
    } catch (err) {
        console.error(err);
        setLocalSeen(!newSeen); // Revert on error
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    setPosting(true);
    window.instaCurateBusy = true;
    try {
      await api.postComment(post.shortcode, commentText);
      
      // Update local state immediately
      setLocalUserComment(commentText);
      setLocalHasLiked(true);
      
      setCommentText('');
      if (onCommentPosted) onCommentPosted();
    } catch (err: any) {
      console.error(err);
      // Try to extract message if catch caught the fetch error or response error
      // Note: api.postComment likely throws an error. We need to check how api service handles it.
      // Assuming api wrapper throws an Error with message.
      alert(`Failed to post comment: ${err.message || 'Unknown error'}`);
    } finally {
      setPosting(false);
      window.instaCurateBusy = false;
    }
  };

  return (
    <article class={`post-card ${collapsed ? 'collapsed' : ''} ${isSeen ? 'seen-card' : ''}`}>
      <div class="post-header" onClick={toggleCollapsed}>
        <div class="header-left">
          <span class={`badge ${badgeClass}`}>{badgeText}</span>
          {hasLiked && <span class="badge badge-liked">Liked</span>}
          {/* Seen badge removed per request, purely relying on opacity style */}
          <span class="post-handle">@{post.profileHandle}</span>
        </div>
        <div class="header-right">
          <span class="post-meta">
            {timeAgo(postedTime)} 
            {post.runDate && ` • ${timeAgo(new Date(post.runDate).getTime())}`}
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
                <strong>Your Comment</strong>
                {localUserComment}
              </div>
            ) : (
             !hasLiked && !isOld && (
                <div class="comment-section-wrapper">
                   {posting && (
                      <div class="comment-overlay">
                          <div class="spinner"></div>
                          <span>Posting comment...</span>
                      </div>
                   )}
                   <div class="suggestion-area">
                     <div class="suggestion-label">Suggested comments:</div>
                     <div class="suggestion-buttons">
                       {suggestions.map((s, i) => (
                         <button key={i} class="btn-use" onClick={() => setCommentText(s)}>{s}</button>
                       ))}
                       <button 
                         class="btn-generate" 
                         disabled={generating}
                         onClick={async () => {
                             setGenerating(true);
                             window.instaCurateBusy = true;
                             try {
                                 const comments = await api.generateComments(post.shortcode);
                                 setSuggestions(comments);
                             } catch (e) {
                                 console.error(e);
                                 alert('Failed to generate suggestions');
                             } finally {
                                 setGenerating(false);
                                 window.instaCurateBusy = false;
                             }
                         }} 
                       >
                        {generating ? 'Generating...' : (suggestions.length > 0 ? '↻ Regenerate Suggestions' : 'Generate Suggestions')}
                       </button>
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

          <div class="post-footer">
            <div class="post-stats">
              <span class="stat-item" title="Rank">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                #{rank}
              </span>
              <span class="stat-item" title="Score">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                 {post.score.toFixed(1)}
              </span>
              <span class="stat-item" title="Comments">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                {post.commentCount}
              </span>
              <span class="stat-item" title="Likes">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                {post.likeCount}
              </span>
            </div>
            
            <div class="footer-actions">
                <button 
                  class={`btn-icon ${isSeen ? 'btn-seen-active' : ''}`} 
                  onClick={toggleSeen} 
                  title={isSeen ? "Mark Unseen" : "Mark Seen"}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        {isSeen ? (
                             <>
                             <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/>
                             </>
                        ) : (
                             <>
                             <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                             </>
                        )}
                    </svg>
                </button>

                <a href={post.postUrl || `https://www.instagram.com/p/${post.shortcode}`} target="_blank" class="post-link">
                  Open 
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

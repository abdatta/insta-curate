import { useState, useEffect } from 'preact/hooks';
import { PostCard } from './components/PostCard';
import { Settings } from './components/Settings';
import { useCuratedPosts } from './hooks/usePosts';
import { api } from './services/api';
import { timeAgo } from './utils/formatting';
import './styles/tokens.css';
import './styles/global.css';
import './styles/components/App.css';

export function App() {
  const { data, loading, error, refresh } = useCuratedPosts();
  const [activeTab, setActiveTab] = useState<'curated' | 'settings'>('curated');
  const [statusText, setStatusText] = useState('');

  // Status Polling for header
  useEffect(() => {
    const checkStatus = async () => {
        try {
            const s = await api.getStatus();
            if (s.lastRun) {
                const finished = s.lastRun.finished_at || s.lastRun.started_at;
                setStatusText(`Last Run: ${timeAgo(finished)}`);
            }
        } catch {}
    };
    checkStatus();
    const int = setInterval(checkStatus, 30000); 
    return () => clearInterval(int);
  }, []);

  return (
    <div id="app">
      <header>
        <h1>InstaCurate</h1>
             <div id="notifications-control">
             {/* Push logic skipped for brevity */}
        </div>
      </header>

      <main>
        <div class="tabs">
          <button class={`tab-btn ${activeTab === 'curated' ? 'active' : ''}`} onClick={() => setActiveTab('curated')}>Curated</button>
          <button class={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
        </div>

        {activeTab === 'curated' && (
          <section class="tab-content active">
             <div class="controls">
                <button onClick={refresh} disabled={loading}>Refresh List</button>
                <div class="status-text">
                    {statusText || 'Last run: Unknown'}
                </div>
             </div>

             {loading && <div>Loading...</div>}
             {error && <div class="error-msg">Error: {error}</div>}
             
             {!loading && data && (
                <div id="curated-list">
                    {(() => {
                        const posts = data.posts;
                        if (posts.length === 0) return <p>No posts found.</p>;
                        
                        const latestRunId = data.latestSuccessfulRunId || (posts.length > 0 ? posts[0].run_id : null);
                        
                        return posts.map((post, idx) => {
                            // User request: "divider between posts from last run and previous runs"
                            // So we just need to detect when we transition from "Latest Run" to "Older"
                            
                            const showDivider = latestRunId && post.run_id !== latestRunId && (idx === 0 || posts[idx-1].run_id === latestRunId);

                            return (
                                <>
                                    {showDivider && (
                                        <div class="run-divider">Previous Runs</div>
                                    )}
                                    <PostCard key={post.shortcode} post={post} rank={idx + 1} />
                                </>
                            );
                        });
                    })()}
                </div>
             )}
          </section>
        )}

        {activeTab === 'settings' && (
          <section class="tab-content active">
             <Settings onRunComplete={() => {
                 setActiveTab('curated');
                 refresh();
             }} />
          </section>
        )}
      </main>
    </div>
  );
}

import { useState, useEffect } from 'preact/hooks';
import { PostCard } from './components/PostCard';
import { Settings } from './components/Settings';
import { ThemeToggle } from './components/ThemeToggle';
import { NotificationToggle } from './components/NotificationToggle';
import { useCuratedPosts } from './hooks/usePosts';
import { api } from './services/api';
import { timeAgo } from './utils/formatting';
import './styles/tokens.css';
import './styles/global.css';
import './styles/components/App.css';
import './styles/components/HeaderLogo.css';

export function App() {
  const { data, loading, error, refresh } = useCuratedPosts();
  const [activeTab, setActiveTab] = useState<'curated' | 'settings'>('curated');
  const [statusText, setStatusText] = useState('');

  // Status Polling for header
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const s = await api.getStatus();
        let text = '';

        if (s.lastRun) {
          const finished = s.lastRun.finished_at || s.lastRun.started_at;
          text = `Last Run: ${timeAgo(finished)}`;
        }

        if (s.nextRun) {
          const next = new Date(s.nextRun);
          // Format: "Next Run at 14:00" or "Next Run at Dec 28 14:00"
          // If it's today, show time?
          const dateStr =
            next.toLocaleDateString() === new Date().toLocaleDateString()
              ? next.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : next.toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

          if (text) text += ' • ';
          text += `Next Run at ${dateStr}`;
        }

        setStatusText(text);
      } catch {}
    };
    checkStatus();
    const int = setInterval(checkStatus, 30000);
    return () => clearInterval(int);
  }, []);

  return (
    <div id="app">
      <header>
        {/* <h1>InstaCurate</h1> */}
        <img
          src="/assets/logo_horizontal.png?v=2"
          alt="InstaCurate"
          class="app-logo"
        />
        <div
          id="notifications-control"
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
        >
          <ThemeToggle />
          <NotificationToggle />
        </div>
      </header>

      <main>
        <div class="tabs">
          <button
            class={`tab-btn ${activeTab === 'curated' ? 'active' : ''}`}
            onClick={() => setActiveTab('curated')}
          >
            Curated
          </button>
          <button
            class={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        {activeTab === 'curated' && (
          <section class="tab-content active">
            <div class="controls">
              <button onClick={refresh} disabled={loading}>
                Refresh List
              </button>
              <div class="status-text">{statusText || 'Last run: Unknown'}</div>
            </div>

            {loading && <div>Loading...</div>}
            {error && <div class="error-msg">Error: {error}</div>}

            {!loading && data && (
              <div id="curated-list">
                {(() => {
                  const posts = data.posts;
                  if (posts.length === 0) return <p>No posts found.</p>;

                  // Use the run_id of the first post as the "Latest Run" for display purposes
                  // This ensures we don't show a divider at the top if the actual latest run was empty
                  const topRunId = posts.length > 0 ? posts[0].runId : null;

                  return posts.map((post, idx) => {
                    // Show divider only when transitioning from the Top Run to an Older Run
                    const showDivider =
                      topRunId &&
                      idx > 0 &&
                      post.runId !== topRunId &&
                      posts[idx - 1].runId === topRunId;

                    return (
                      <>
                        {showDivider && (
                          <div class="run-divider">Previous Runs</div>
                        )}
                        <PostCard
                          key={post.shortcode}
                          post={post}
                          rank={idx + 1}
                        />
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
            <Settings
              onRunComplete={() => {
                setActiveTab('curated');
                refresh();
              }}
            />
          </section>
        )}
      </main>
    </div>
  );
}

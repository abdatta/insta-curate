const state = {
  publicKey: null
};

// UI Elements
const tabs = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const curatedList = document.getElementById('curated-list');
const refreshBtn = document.getElementById('refresh-btn');
const lastRunStatus = document.getElementById('last-run-status');
const runNowBtn = document.getElementById('run-now-btn');
const runMsg = document.getElementById('run-msg');
const profilesInput = document.getElementById('profiles-input');
const saveProfilesBtn = document.getElementById('save-profiles');
const scheduleEnabled = document.getElementById('schedule-enabled');
const scheduleInterval = document.getElementById('schedule-interval');
const enablePushBtn = document.getElementById('enable-push');

// Tabs
tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
  });
});

// Notifications
async function initPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push not supported');
    return;
  }

  // Get Key
  const res = await fetch('/api/push/vapidPublicKey');
  const data = await res.json();
  state.publicKey = data.publicKey;

  // Check permission
  if (Notification.permission === 'granted') {
    enablePushBtn.textContent = 'Notifications Enabled';
    enablePushBtn.disabled = true;
    subscribeUser();
  } else {
    enablePushBtn.textContent = 'Enable Notifications';
    enablePushBtn.disabled = false;
  }
}

enablePushBtn.addEventListener('click', async () => {
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    enablePushBtn.textContent = 'Notifications Enabled';
    enablePushBtn.disabled = true;
    subscribeUser();
  }
});

async function subscribeUser() {
  const reg = await navigator.serviceWorker.ready;
  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(state.publicKey)
    });
    // Send to server
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub)
    });
    console.log('Subscribed to push');
  } catch (err) {
    console.error('Failed to subscribe', err);
  }
}

// Utils
function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

// API Calls
async function loadCurated() {
  curatedList.innerHTML = 'Loading...';
  try {
    const res = await fetch('/api/curated/latest');
    const data = await res.json();
    renderCurated(data);
  } catch (err) {
    curatedList.innerHTML = 'Error loading data.';
  }
}

function renderCurated(data) {
  if (!data.run) {
    curatedList.innerHTML = '<p>No runs yet.</p>';
    lastRunStatus.textContent = '';
    return;
  }
  
  if (data.run.status === 'failed') {
      showToast(`Last run failed: ${data.run.message}`, 'error');
  }
  
  const runTime = new Date(data.run.finished_at || data.run.started_at).getTime();
  lastRunStatus.textContent = `Last run: ${timeAgo(runTime)} (${data.run.status})`;
  
    // Toast
    if (data.run.status === 'failed') {
        showToast(`Last run failed: ${data.run.message}`, 'error');
    }
  
  if (!data.posts || data.posts.length === 0) {
    curatedList.innerHTML = '<p>No posts found in last run.</p>';
    return;
  }

    const latestRunId = data.latestSuccessfulRunId || (data.posts[0] ? data.posts[0].run_id : null);
    
    // Group posts by Run? Or just separate Latest vs History
    // The data.posts are ordered by run_id DESC, score DESC.
    
    let html = '';
    let hasShownHistoryHeader = false;
    let currentRunId = null;

    try {
        data.posts.forEach((post, index) => {
            // Headers/Dividers
            if (post.run_id !== currentRunId) {
                currentRunId = post.run_id;
                
                if (currentRunId === latestRunId) {
                    // Latest Run Header (Optional, maybe just implicit)
                } else {
                    // History Divider
                    if (!hasShownHistoryHeader) {
                       html += `<div class="history-divider"><span>Previous Runs</span></div>`;
                       hasShownHistoryHeader = true;
                    }
                }
            }
    
            // Logic (Freshness, etc) - copy form previous
            const postedTime = new Date(post.posted_at).getTime();
            const now = new Date().getTime();
            const ageHours = (now - postedTime) / (1000 * 60 * 60);
            
            // ... (Re-use existing logic)
            let badgeClass = '';
            let badgeText = '';
            let isOld = false;
            
            if (ageHours < 24) { badgeClass = 'badge-new'; badgeText = 'New'; }
            else if (ageHours < 48) { badgeClass = 'badge-late'; badgeText = 'Late'; }
            else { badgeClass = 'badge-old'; badgeText = 'Old'; isOld = true; }
        
            const hasLiked = !!post.has_liked;
            const hasCommented = !!post.user_comment;
            const isCollapsed = isOld || hasLiked || hasCommented;
            const collapsedClass = isCollapsed ? 'collapsed' : '';
            const likedBadge = hasLiked ? '<span class="badge badge-liked">Liked</span>' : '';
        
            // Comments
            let commentHtml = '';
            if (hasCommented) {
                 commentHtml = `<div class="saved-comment"><strong>Your Comment:</strong>${escapeHtml(post.user_comment)}</div>`;
            } else if (!isOld && !hasLiked) {
                 const suggestions = [ "Great shot! 📸", "Amazing content! 🙌", "Love this! 🔥", "Totally agree! 💯" ];
                 const suggestionsHtml = suggestions.map((s, i) => `
                    <div class="suggestion-row">
                        <div class="suggestion-text" id="sug-${post.shortcode}-${i}">${s}</div>
                        <button class="btn-use" onclick="useSuggestion('${post.shortcode}', '${escapeJs(s)}')">Use</button>
                    </div>`).join('');
                 commentHtml = `
                    <div class="post-comment-section">
                        ${suggestionsHtml}
                        <div class="comment-input-row">
                            <input type="text" class="comment-input" id="input-${post.shortcode}" placeholder="Write a comment...">
                            <button class="btn-post" id="btn-${post.shortcode}" onclick="postComment('${post.shortcode}')">Post</button>
                        </div>
                    </div>`;
            }
            
            // Safe score
            const scoreDisplay = typeof post.score === 'number' ? post.score.toFixed(2) : post.score;
        
            html += `
            <article class="post-card ${collapsedClass}" id="card-${post.shortcode}">
                <div class="post-header" onclick="togglePost('${post.shortcode}')" style="cursor: pointer">
                    <div style="display:flex; align-items:center; gap:0.5rem">
                        <span class="badge ${badgeClass}">${badgeText}</span>
                        ${likedBadge}
                        <span class="post-handle">@${post.profile_handle}</span>
                    </div>
                    <div style="text-align:right">
                        <span class="post-meta">${timeAgo(postedTime)} • <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -1px; margin-right: 2px;"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M12 7v5l4 2"></path></svg>${post.run_date ? timeAgo(new Date(post.run_date).getTime()) : ''}</span>
                    </div>
                </div>
                
                <div class="collapsible-wrapper">
                    <div class="collapsible-content">
                        <div class="post-embed">
                            <iframe src="https://www.instagram.com/p/${post.shortcode}/embed" frameborder="0" scrolling="no" allowtransparency="true" loading="lazy"></iframe>
                        </div>
                
                        <div class="post-caption">${post.caption ? escapeHtml(post.caption).replace(/\n/g, '<br>') : '<i>No caption</i>'}</div>
                        ${commentHtml}
                        <div class="post-stats">
                            <span>Rank #${index + 1}</span>
                            <span>Score: ${scoreDisplay}</span>
                            <span>Comments: ${post.comment_count}</span>
                            <span>Likes: ${post.like_count || '?'}</span>
                        </div>
                        <a href="${post.post_url}" target="_blank" class="post-link">Open in Instagram</a>
                    </div>
                </div>
            </article>
          `;
        });
        curatedList.innerHTML = html;
        
    } catch (e) {
        console.error(e);
        curatedList.innerHTML = `<div style="color:red; padding:1rem;">Error rendering posts: ${e.message}</div>`;
    }
}

// Interactivity
window.togglePost = (shortcode) => {
    const card = document.getElementById(`card-${shortcode}`);
    if (card) {
        card.classList.toggle('collapsed');
    }
};

window.useSuggestion = (shortcode, text) => {
    const input = document.getElementById(`input-${shortcode}`);
    if (input) {
        input.value = text;
        input.focus();
    }
};

window.postComment = async (shortcode) => {
    const input = document.getElementById(`input-${shortcode}`);
    const btn = document.getElementById(`btn-${shortcode}`);
    const comment = input.value.trim();
    
    if (!comment) return;
    
    btn.disabled = true;
    btn.textContent = 'Posting...';
    
    try {
        const res = await fetch(`/api/posts/${shortcode}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment })
        });
        
        if (res.ok) {
            // Update UI to "Commented" state
            // Re-fetch curated list to refresh state properly or hack it
            loadCurated(); 
        } else {
            alert('Failed to save comment');
            btn.disabled = false;
            btn.textContent = 'Post';
        }
    } catch (e) {
        console.error(e);
        alert('Error posting comment');
        btn.disabled = false;
        btn.textContent = 'Post';
    }
};

// Utils Helpers
function timeAgo(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    // Less than a week (7 days)
    if (seconds < 604800) {
        if (seconds < 60) return "just now";
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return Math.floor(seconds) + "s ago";
    }

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();

    if (year === now.getFullYear()) {
        return `${month} ${day}`;
    } else {
        return `${month} ${day}, ${year}`;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeJs(text) {
    if (!text) return '';
    return text.replace(/'/g, "\\'");
}

async function loadSettings() {
  // Profiles
  const pRes = await fetch('/api/admin/profiles');
  const pData = await pRes.json();
  profilesInput.value = pData.profiles.map(p => p.handle).join('\n');

  // Schedule
  const sRes = await fetch('/api/admin/settings');
  const sData = await sRes.json();
  scheduleEnabled.checked = sData.schedule_enabled;
  scheduleInterval.value = sData.schedule_interval_hours;
}

async function saveProfiles() {
  const handles = profilesInput.value.split('\n').map(s => s.trim()).filter(Boolean);
  await fetch('/api/admin/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ handles })
  });
  alert('Profiles saved');
}

async function saveSchedule() {
    // We save on change
    await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            schedule_enabled: scheduleEnabled.checked,
            schedule_interval_hours: parseInt(scheduleInterval.value)
        })
    });
}


// Polling for status
let pollInterval = null;

function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

function startPolling(fast = false) {
    stopPolling();
    pollInterval = setInterval(checkStatus, fast ? 1000 : 5000);
}

async function checkStatus() {
    try {
        // We poll progress if running, or status if idle (to catch external runs)
        // But if we triggered it via UI, we are in "monitoring mode".
        // Let's check /admin/progress first if we think we are running.
        
        const pRes = await fetch('/api/admin/progress');
        const progress = await pRes.json();
        
        if (progress.status === 'running') {
             // Update UI
             renderProgress(progress);
             
             // Ensure buttons
             runNowBtn.disabled = true;
             runMsg.textContent = 'Curation in progress...';
             
             // Ensure progress visible
             document.getElementById('progress-container').style.display = 'block';
             
             // Speed up polling if not already fast?
             // We are inside polling loop, if we called startPolling(true) it keeps going.
        } else if (progress.status === 'completed' || progress.status === 'failed') {
            // It just finished?
             renderProgress(progress);
             
             if (runNowBtn.disabled) {
                 // It was running, now done.
                 runNowBtn.disabled = false;
                 runMsg.textContent = progress.status === 'completed' ? 'Done.' : 'Failed.';
                 
                 if (progress.status === 'completed') {
                     handleCompletion(progress);
                 } else {
                     showToast(`Run failed: ${progress.error}`, 'error');
                 }
                 
                 // Stop fast polling, go back to slow
                 startPolling(false);
             }
        } else {
            // Idle
             document.getElementById('progress-container').style.display = 'none';
             if (runNowBtn.disabled) {
                 runNowBtn.disabled = false;
                 runMsg.textContent = '';
             }
             
             // Check generic status for "Last Run" label update
             const sRes = await fetch('/api/admin/status');
             const sData = await sRes.json();
             if (sData.lastRun) {
                 const runTime = new Date(sData.lastRun.finished_at || sData.lastRun.started_at).getTime();
                 lastRunStatus.textContent = `Last run: ${timeAgo(runTime)} (${sData.lastRun.status})`;
             }
        }
    } catch (e) {
        console.error('Polling error', e);
    }
}

function renderProgress(progress) {
    const list = document.getElementById('task-list');
    
    // Tasks
    list.innerHTML = progress.tasks.map(t => {
        let handleText = t.handle;
        if (t.handle === TASK_INITIALIZING || t.handle === TASK_DONE) {
            // No prefix
        } else if (t.handle.startsWith('__')) {
            handleText = t.handle.replace(/__/g, '');
        } else {
            handleText = '@' + t.handle;
        }

        return `
        <div class="task-item">
            <div class="task-status-icon status-${t.status}"></div>
            <div class="task-handle">${handleText}</div>
            <div class="task-message">${t.message || ''}</div>
        </div>
        `;
    }).join('');
}

function handleCompletion(progress) {
    showToast(`Curation complete with ${progress.curatedCount} new posts`, 'success');
    
    // Auto collapse after short delay
    setTimeout(() => {
        document.getElementById('progress-container').style.display = 'none';
        
        // Switch tab
        const curatedTabBtn = document.querySelector('[data-tab="curated"]');
        if (curatedTabBtn) curatedTabBtn.click();
        
        // Refresh
        loadCurated();
    }, 1500);
}

async function runNow() {
    runNowBtn.disabled = true;
    runMsg.textContent = 'Starting run...';
    
    // Reset UI
    document.getElementById('progress-container').style.display = 'block';
    
    // Immediate feedback: Show Initializing task
    const list = document.getElementById('task-list');
    list.innerHTML = `
        <div class="task-item">
            <div class="task-status-icon status-processing"></div>
            <div class="task-handle">${TASK_INITIALIZING}</div>
            <div class="task-message">Starting browser...</div>
        </div>
    `;
    
    try {
        const res = await fetch('/api/admin/run', { method: 'POST' });
        if (res.ok) {
            runMsg.textContent = 'Run started.';
            showToast('Curation run started', 'success');
            // Start fast polling
            startPolling(true);
        } else {
            const d = await res.json();
            runMsg.textContent = `Error: ${d.message}`;
            showToast(`Error: ${d.message}`, 'error');
            runNowBtn.disabled = false;
        }
    } catch (e) {
        runMsg.textContent = 'Error starting run.';
        showToast('Network error starting run', 'error');
        runNowBtn.disabled = false;
    }
}

// Init
refreshBtn.addEventListener('click', loadCurated);
saveProfilesBtn.addEventListener('click', saveProfiles);
runNowBtn.addEventListener('click', runNow);
scheduleEnabled.addEventListener('change', saveSchedule);
scheduleInterval.addEventListener('change', saveSchedule);

loadCurated();
loadSettings();
initPush();

// Start initial polling (slow)
startPolling(false);


function showToast(msg, type = 'info') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = `toast visible ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('visible');
    }, 3000);
}

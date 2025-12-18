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
            
            <div class="post-embed">
                <iframe src="https://www.instagram.com/p/${post.shortcode}/embed" frameborder="0" scrolling="no" allowtransparency="true" loading="lazy"></iframe>
            </div>
    
            <div class="post-caption">${post.caption ? escapeHtml(post.caption).replace(/\n/g, '<br>') : '<i>No caption</i>'}</div>
            ${commentHtml}
            <div class="post-stats">
                <span>Rank #${index + 1}</span>
                <span>Score: ${post.score.toFixed(2)}</span>
                <span>Comments: ${post.comment_count}</span>
                <span>Likes: ${post.like_count || '?'}</span>
            </div>
            <a href="${post.post_url}" target="_blank" class="post-link">Open in Instagram</a>
        </article>
      `;
    });
    
    curatedList.innerHTML = html;
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

async function runNow() {
    runNowBtn.disabled = true;
    runMsg.textContent = 'Starting run...';
    try {
        const res = await fetch('/api/admin/run', { method: 'POST' });
        if (res.ok) {
            runMsg.textContent = 'Run started.';
            showToast('Curation run started', 'success');
        } else {
            const d = await res.json();
            runMsg.textContent = `Error: ${d.message}`;
            showToast(`Error: ${d.message}`, 'error');
        }
    } catch (e) {
        runMsg.textContent = 'Error starting run.';
        showToast('Network error starting run', 'error');
    } finally {
        setTimeout(() => {
            runNowBtn.disabled = false;
            runMsg.textContent = '';
            loadCurated(); // Update status
        }, 2000);
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

// Polling for status
setInterval(() => {
    fetch('/api/admin/status')
        .then(r => r.json())
        .then(d => {
            if (d.running) {
                lastRunStatus.textContent = 'Status: RUNNING...';
                runNowBtn.disabled = true;
            } else if (d.lastRun) {
                // If we just finished running, maybe refresh list?
                // Minimal: just show status
                if (runNowBtn.disabled && !d.running) {
                    // It finished
                    runNowBtn.disabled = false;
                    loadCurated();
                }
            }
        });
}, 5000);

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

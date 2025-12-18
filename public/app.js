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
  
  lastRunStatus.textContent = `Last run: ${new Date(data.run.finished_at || data.run.started_at).toLocaleString()} (${data.run.status})`;
  
  if (!data.posts || data.posts.length === 0) {
    curatedList.innerHTML = '<p>No posts found in last run.</p>';
    return;
  }

  curatedList.innerHTML = data.posts.map((post, index) => `
    <article class="post-card">
        <div class="post-header">
            <span class="post-handle">@${post.profile_handle}</span>
            <span class="post-meta">${new Date(post.posted_at).toLocaleString()}</span>
        </div>
        <div class="post-stats">
            Rank #${index + 1} | Score: ${post.score.toFixed(2)} | Comments: ${post.comment_count} | Likes: ${post.like_count || '?'}
        </div>
        <a href="${post.post_url}" target="_blank" class="post-link">Open in Instagram</a>
    </article>
  `).join('');
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
        } else {
            const d = await res.json();
            runMsg.textContent = `Error: ${d.message}`;
        }
    } catch (e) {
        runMsg.textContent = 'Error starting run.';
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

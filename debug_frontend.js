// Use global fetch


// Mock DOM elements
const document = {
    getElementById: (id) => ({ 
        style: {}, 
        textContent: '', 
        innerHTML: '', 
        classList: { add:()=>{}, remove:()=>{}, toggle:()=>{} },
        addEventListener:()=>{} 
    }),
    querySelectorAll: () => [],
    createElement: () => ({ className: '', classList: { remove:()=>{} } }),
    body: { appendChild: ()=>{} }
};
const window = {
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    togglePost: () => {},
    useSuggestion: () => {},
    postComment: () => {}
};
const navigator = {};

// Helper functions from app.js
function timeAgo(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
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
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function escapeJs(text) {
    if (!text) return '';
    return text.replace(/'/g, "\\'");
}

// Logic to test
async function testRender() {
    try {
        console.log('Fetching data...');
        const res = await fetch('http://localhost:3000/api/curated/latest');
        const data = await res.json();
        console.log('Data received. Posts:', data.posts.length);
        
        const latestRunId = data.latestSuccessfulRunId || (data.posts[0] ? data.posts[0].run_id : null);
        let currentRunId = null;
        let hasShownHistoryHeader = false;
        
        data.posts.forEach((post, index) => {
            console.log(`Processing post ${index} (ID: ${post.shortcode})`);
            
            // Check likely crash points
            const postedTime = new Date(post.posted_at).getTime();
            const now = new Date().getTime();
            const ageHours = (now - postedTime) / (1000 * 60 * 60);
            
            let badgeClass = '';
            let badgeText = '';
            let isOld = false;
            
            if (ageHours < 24) { badgeClass = 'badge-new'; badgeText = 'New'; }
            else if (ageHours < 48) { badgeClass = 'badge-late'; badgeText = 'Late'; }
            else { badgeClass = 'badge-old'; badgeText = 'Old'; isOld = true; }

            const hasLiked = !!post.has_liked;
            const hasCommented = !!post.user_comment;
            
            // This is where it likely crashes if score is not number
            const scoreStr = post.score.toFixed(2);
            
            // This is where it crashes if template fails
            const caption = post.caption ? escapeHtml(post.caption).replace(/\n/g, '<br>') : '<i>No caption</i>';
            
            // ...
        });
        console.log('Finished processing posts successfully.');
    } catch (e) {
        console.error('CRASHED:', e);
    }
}

testRender();

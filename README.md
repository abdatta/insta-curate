```
# Instagram Curator (insta-curate)

> **For AI Agents:** Please refer to [AGENT.md](./AGENT.md) for context, rules, and navigation.

## Overview
A minimal Node.js + TypeScript PWA that curates Instagram posts from your feed based on engagement rules.

## Features
- **Curated Feed**: Automatically selects posts from the last 24h with >3 comments and high engagement.
- **PWA UI**: Mobile-friendly, installable on Android/iOS (Add to Home Screen).
- **Push Notifications**: Get notified when curation completes.
- **Schedule**: configurable run interval (default 12h).
- **Admin Settings**: Manage profile list, schedule, and view detailed run progress.

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   npx playwright install chromium
   ```

2. **Login (Important!)**
   You must log in to Instagram manually once to save the session.
   ```bash
   npm run login
   ```
   - A browser window will open.
   - Log in to your Instagram account.
   - Return to the terminal and press **Enter** to save the session.

3. **Start Server**
   ```bash
   npm run dev
   ```
   - App runs at `http://localhost:3000`.

## Usage
1. Open `http://localhost:3000` in your browser.
2. Go to **Settings** tab.
3. Add Instagram handles to monitor (one per line).
4. Click **Run Curation Now** to test immediately and watch the progress tasks.
5. Enable Notifications to get status updates.

## PWA & Notifications (Localhost)
To test PWA installation and Push Notifications on localhost (if not using HTTPS):
- **Chrome**: Go to `chrome://flags/#unsafely-treat-insecure-origin-as-secure` and add `http://localhost:3000`.
- **Android**: Connect via USB debugging and forward ports, or access via local IP if HTTPS is configured (not included by default).

## Database
Data is stored in `data/app.db` (SQLite).
Session is stored in `data/storageState.json`.

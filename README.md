# InstaCurate

> **For AI Agents:** Please refer to [AGENT.md](./AGENT.md) for context, rules, and navigation.

## Overview

**InstaCurate** is a personal, self-hosted web application that helps you stay up-to-date with your favorite Instagram accounts without the noise.

It periodically scans a curated list of profiles, scores their recent posts based on engagement and recency, and presents the best content in a distraction-free, ad-free feed. Built as a Progressive Web App (PWA), it can be installed on your phone for a native app experience.

## Features

- **Smart Curation**: Automatically surfaces the highest-value posts (last 24h, high comment count).
- **Distraction-Free Feed**: View posts, captions, and media without algorithm injections or ads.
- **Granular Profile Control**:
  - **Add** specific handles to watch.
  - **Toggle** curation on/off for individual profiles.
  - **Delete** profiles you no longer follow.
- **Optimistic UI**: Real-time feedback on curation progress with granular task tracking.
- **PWA Ready**: Install on Android/iOS (Add to Home Screen) with offline caching.
- **Push Notifications**: Receive alerts when new posts are curated.
- **Privacy-First**: Your data runs locally on your machine.

## Getting Started

### Prerequisites

- Node.js (v18+)
- An Instagram account

### Installation

1.  **Clone & Install**

    ```bash
    git clone https://github.com/your-username/insta-curate.git
    cd insta-curate
    npm install
    npx playwright install chromium
    ```

2.  **Authenticate (One-Time Setup)**
    Use the included authentication helper to create a session file. This opens a browser window where you can log in securely.

    ```bash
    npm run login
    ```

    _Return to the terminal and press **Enter** after logging in to save your session._

3.  **Run the Server**
    Start both the backend curator and the frontend client.

    ```bash
    npm run dev
    ```

    - Dashboard: `http://localhost:5173`

## Usage Guide

### Managing Profiles

1.  Navigate to the **Settings** tab.
2.  **Add**: Type an Instagram handle (e.g., `natgeo`) in the input field and press **Enter**.
3.  **Toggle**: Use the switch next to a profile to pause/resume curation for that specific account.
4.  **Delete**: Click the trash icon to remove a profile.

### Running Curation

- **Manual**: Click **Run Curation Now** in Settings. The task list will immediately update to show the status of each enabled profile.
- **Scheduled**: Enable the schedule in Settings (default: every 4 hours) to let InstaCurate run in the background.

## Database & Privacy

- **Data Location**: All data is stored locally in `data/app.db` (SQLite).
- **Session**: Your login cookies are stored in `data/storageState.json`. **Keep this file secure.**

## Architecture

- **Backend**: Node.js, Express, Playwright (Scraping), better-sqlite3.
- **Frontend**: Vite, Preact, TypeScript, CSS Modules.
- **Shared**: Common constants and types located in `shared/`.

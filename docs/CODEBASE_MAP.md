# Codebase Map

## `src/` (Backend & Logic)

| Directory | Responsibility | Key Files |
| :--- | :--- | :--- |
| **`curator/`** | The core business logic. | `scrapeProfile.ts` (Network Interception), `runCuration.ts` (Orchestrator), `auth.ts` (Login). |
| **`db/`** | Persistence layer. | `repo.ts` (Queries), `migrations.ts` (Schema Updates), `db.ts` (Connection). |
| **`push/`** | Notification handling. | `send.ts` (Sending logic), `vapid.ts` (Key storage). |
| **`main.ts`** | **Entry Point**. Init DB, Scheduler, Server. | |
| **`routes.ts`** | API Endpoints definition. | |

## `public/` (Frontend)

| File | Responsibility |
| :--- | :--- |
| **`app.js`** | Single-page logic. Routing, API calls, DOM rendering. |
| **`sw.js`** | Service Worker. Handles Push events and offline caching. |
| **`styles.css`** | Global styles (Variables, Dark mode logic). |
| **`index.html`** | The shell. |

## `data/` (State)

| File | Responsibility |
| :--- | :--- |
| `app.db` | The SQLite database. |
| `storageState.json` | Playwright cookies/localstorage (Sensitive!). |
| `vapid.json` | Private Push Keys (Sensitive!). |

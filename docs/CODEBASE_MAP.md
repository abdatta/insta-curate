# Codebase Map

## `src/` (Backend & Logic)

| Directory | Responsibility | Key Files |
| :--- | :--- | :--- |
| **`curator/`** | The core business logic. | `scrapeProfile.ts` (Network Interception), `runCuration.ts` (Orchestrator), `auth.ts` (Login). |
| **`db/`** | Persistence layer. | `repo.ts` (Queries), `migrations.ts` (Schema Updates), `db.ts` (Connection). |
| **`push/`** | Notification handling. | `send.ts` (Sending logic), `vapid.ts` (Key storage). |
| **`main.ts`** | **Entry Point**. Init DB, Scheduler, Server. | |
| **`routes.ts`** | API Endpoints definition. | |
| **`services/`** | External Integrations. | `ai.ts` (OpenAI Service). |
| **`shared/`** | Common code shared between Client and Server. | `constants.ts` (Task names), `types.ts` (API Contracts). |

## `client/` (Frontend - Vite + Preact)

| Directory/File | Responsibility |
| :--- | :--- |
| **`src/app.tsx`** | Main entry component & routing logic. |
| **`src/components/`** | UI components (`PostCard`, `Settings`). |
| **`src/styles/`** | CSS Modules (component-scoped) and Tokens. |
| **`src/services/`** | API abstractions (`api.ts`). |
| **`vite.config.ts`** | Build configuration. |

## `data/` (State)

| File | Responsibility |
| :--- | :--- |
| `app.db` | The SQLite database. |
| `storageState.json` | Playwright cookies/localstorage (Sensitive!). |
| `vapid.json` | Private Push Keys (Sensitive!). |

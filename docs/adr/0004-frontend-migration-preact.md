# 4. Migrate Frontend to Preact + TypeScript + Vite

Date: 2025-12-19

## Status

Accepted

## Context

The original frontend was built with Vanilla HTML/JS/CSS to keep dependencies low ("Rule #3"). However, as features grew (Comments, Run Control, Progress UI, Tabs), the single `app.js` file became difficult to manage. DOM manipulation was imperative and error-prone. State management was scattered.

## Decision

We decided to migrate the `client/` directory to a **Vite + Preact + TypeScript** stack.

### Choices

- **Preact**: chosen over React for its smaller footprint (3kb), aligning with the project's "lightweight" goal while offering component-based architecture and React compatibility if needed later.
- **Vite**: for fast development server (HMR) and optimized build process.
- **TypeScript**: for type safety shared with the backend (interfaces).
- **CSS Modules (vanilla)**: to keep styling standard CSS but scoped to components, avoiding CSS-in-JS overhead.

## Consequences

### Positive
- **Maintainability**: Components (`PostCard`, `Settings`) are isolated and testable.
- **Type Safety**: `Post` and `Task` types are shared/consistent.
- **Developer Experience**: HMR makes UI iteration much faster than refreshing the Express server.
- **Scalability**: Easier to add complex features (like the visual progress tracker) without spaghetti DOM code.

### Negative
- **Build Step**: Requires `npm run build` (handled by `npm run dev` concurrency or explicitly).
- **Dependencies**: Added `vite`, `preact`, `typescript` and build tools to `package.json`.

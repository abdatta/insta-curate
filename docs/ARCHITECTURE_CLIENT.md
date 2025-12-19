# Client Architecture

This frontend is built with **Vite, Preact, and TypeScript**. It emphasizes modularity, performance, and a clean theming system via CSS variables.

## Folder Structure

```
client/
├── src/
│   ├── components/      # Reusable UI components (PostCard, Settings, etc.)
│   ├── hooks/           # Custom state logic (useCuratedPosts)
│   ├── services/        # API communication layer
│   ├── styles/          # Design tokens and global styles
│   ├── utils/           # Shared helper functions
│   ├── app.tsx          # Main application shell and routing
│   └── main.tsx         # Entry point
```

## Design System

Theming is handled entirely via CSS Variables in `src/styles/tokens.css`.
- **Tokens**: Colors (`--color-primary`), Spacing (`--space-4`), Typography, etc.
- **Dark Mode**: Supported via `[data-theme="dark"]` selector overrides.
- **Convention**: Use tokens for all styling. Avoid hardcoded hex values or pixels.

## Key Patterns

- **API Service**: All fetch calls are centralized in `services/api.ts` and return typed promises.
- **Hooks**: Complex state logic (fetching, loading states) is extracted into hooks like `useCuratedPosts`.
- **Components**: Functional components using Preact hooks. Keep logic minimal; delegate to hooks or utils.

## Commands

- `npm run dev`: Start development server (proxies `/api` to backend).
- `npm run build`: Build production assets to `dist/`.

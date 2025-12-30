# 8. Local Database Visualization

Date: 2025-12-30

## Status

Accepted

## Context

As the application relies on a local SQLite database (`data/app.db`) for all persistence (posts, runs, profiles, settings), debugging and data inspection have historically required external tools (e.g., DB Browser for SQLite) or terminal-based queries.

We needed a way to visualize the database directly from the application infrastructure to:

1.  Speed up debugging during development.
2.  Allow quick verification of data state (e.g., did the run save? is the profile disabled?) without leaving the browser context.
3.  Avoid the friction of installing/opening external desktop apps.

## Decision

We decided to integrate **`sqlite-gui-node`** as an Express middleware to provide a web-based GUI for the SQLite database.

### Implementation Details

1.  **Driver Compatibility**:
    - The project primarily uses `better-sqlite3` for its synchronous performance and API.
    - However, `sqlite-gui-node` depends on the `sqlite3` driver's API (specifically `.serialize()`).
    - **Decision**: We incorrectly attempted to pass the `better-sqlite3` instance initially. We corrected this by installing `sqlite3` alongside `better-sqlite3` and explicitly instantiating a `sqlite3.Database` connection _solely_ for the viewer middleware. This isolates the legacy driver usage to just this tool while keeping core application logic on `better-sqlite3`.

2.  **Routing**:
    - The viewer is mounted at `/db-viewer`.
    - Since `sqlite-gui-node` expects to control its own routing and assets, we proxy this route in `vite.config.ts` during development (`npm run dev`) to ensure the frontend dev server forwards requests to the backend.
    - We added a redirect from `/db-viewer` to `/db-viewer/home` because the library is strict about its home path.

3.  **UI Integration**:
    - To keep the Admin UI clean and focused on curation, the link to the database viewer is placed conspicuously at the very bottom of the **Settings** page, styled as a small, gray textual link.

## Consequences

### Positive

- **Visual Inspection**: Developers can now instantly view tables, schema, and data at `localhost:3000/db-viewer`.
- **Zero Friction**: No external tools required.
- **Safe Isolation**: The viewer runs on a separate connection, minimizing risk to the main application's database interactions (WAL mode handles concurrency).

### Negative

- **Dependency bloat**: We now include `sqlite3` (native bindings) in addition to `better-sqlite3`. This slightly increases install time and binary size.
- **Security**: The viewer exposes full read/write access to the database.
  - _Mitigation_: The app is designed for **local, single-user use**. If this were ever exposed to the public internet, this route MUST be protected behind authentication or removed.

## References

- [sqlite-gui-node on NPM](https://www.npmjs.com/package/sqlite-gui-node)

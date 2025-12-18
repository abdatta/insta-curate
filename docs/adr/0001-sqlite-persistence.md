# ADR-0001: SQLite for Persistence

## Context
We needed a way to store persistent data (profiles, posts, run history) for a locally-hosted, single-user node application.

## Decision
We chose **SQLite** (via `better-sqlite3`).

## Alternatives Considered
- **JSON Files (`lowdb`)**: Rejected because relational data (Runs -> Posts) gets complex to query and maintain in JSON.
- **PostgreSQL / Docker**: Rejected because it adds significant operational overhead (running a container) for a tool meant to be "grab and run".

## Consequences
- **Pros**: Zero config, single file backup (`data/app.db`), relational integrity (FKs), fast enough for 100k+ rows.
- **Cons**: Migrations must be managed carefully in code (`src/db/migrations.ts`). No concurrent write support (not an issue for single-user).

## References
- `src/db/db.ts`

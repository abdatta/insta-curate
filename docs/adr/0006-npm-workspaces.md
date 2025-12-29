# 6. NPM Workspaces for Monorepo Management

Date: 2025-12-29

## Status

Accepted

## Context

Our project structure consists of a root backend implementation and a nested `client` directory containing the frontend (Vite/Preact) application. Previously, we managed dependencies by running separate `npm install` commands in the root and `client` directories. This led to:

1.  **Manual Friction**: Developers had to manually `cd client && npm install`.
2.  **Versioning Drift**: Duplicate dependencies (like `typescript`) could drift between root and client.
3.  **Script Hacks**: We attempted to use root `postinstall` scripts to trigger client installation, but this caused potential recursion loops, file locking issues on Windows, and general fragility.

## Decision

We have decided to migrate to **NPM Workspaces**.

We configured the root `package.json` with `"workspaces": ["client"]`. This allows the standard `npm` client (v7+) to manage dependencies for both the root and the `client` package in a single tree.

## Consequences

### Positive

- **Single Install**: Running `npm install` in the root installs dependencies for the entire project.
- **Unified Lockfile**: A single `package-lock.json` at the root ensures consistent dependency resolution across the entire graph.
- **Hoisting**: Shared dependencies are hoisted to the root `node_modules`, reducing disk usage and installation time.
- **Command Ergonomics**: We can run client scripts from the root using `npm run <command> --workspace=client`.

### Negative

- **Hoisting Caveats**: Some tools might naively look for `node_modules` only in the current directory (`client/`). However, modern Node resolution handling usually manages this correctly.
- **Migration**: We had to delete `client/package-lock.json`, meaning we lost the specific locked versions for the client, though `package.json` semver ranges were respected during the fresh install.

## Compliance

- Developers must now rely on the root `npm install` and avoid creating a dedicated `client/package-lock.json`.

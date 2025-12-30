# 9. Strict Linting and Type Safety

Date: 2025-12-30

## Status

Accepted

## Context

As the codebase grew, we noticed an accumulation of unused variables, redundant imports, and potential "dead code" paths that TypeScript's default loose configuration was ignoring. This creates noise for developers (visual clutter) and increases the risk of shipping code that "looks" active but isn't.

Unused imports also bloat the mental model of a file's dependencies.

We previously ran `prettier` for formatting and `tsc` locally, but these checks were not strictly enforced in a unified way before commits, leading to potential regressions in code hygiene.

## Decision

We have decided to enforce **Strict Linting and Type Safety** across the entire repository (both Server and Client).

Specifically:

1.  **TypeScript Configuration**:
    - Enable `"noUnusedLocals": true`
    - Enable `"noUnusedParameters": true`
    - Continue using `"strict": true`

2.  **Consolidated Linting**:
    - The `npm run lint` command is the single source of truth for code quality.
    - It runs `prettier --check` (formatting) AND `npm run type-check` (logic/types).

3.  **Automation**:
    - **Pre-commit Hook**: A Husky hook runs `lint-staged` using a smart configuration (`lint-staged.config.js`):
      - Runs `prettier --write` (with `prettier-plugin-organize-imports`) on ALL staged files.
      - Runs `npm run type-check` on the whole project ONLY if TypeScript files are modified.
    - **VS Code**: Configured `editor.codeActionsOnSave` to `source.organizeImports: "explicit"`.

## Consequences

### Positive

- **Cleaner Codebase**: Dead code is immediately flagged and often auto-removed.
- **Higher Confidence**: Passing the build/lint step guarantees a higher baseline of code quality.
- **Consistency**: All developers (and AI agents) are held to the same mechanical standard.

### Negative

- **Friction**: Prototyping can be slightly annoying because unused variables (e.g., temporary debug vars) will cause build errors.
  - _Mitigation_: Prefix unused variables with `_` (e.g., `_req`) to explicitly signal intent to ignore them.

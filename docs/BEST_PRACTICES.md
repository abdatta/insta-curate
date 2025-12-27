# Best Practices

Follow these guidelines to maintain code quality and agent-friendliness in this repository.

## 1. Commit Messages

We use a structured format to make history scannable and generate good summaries.

- **Style**: Imperative mood ("Add feature", not "Added feature").
- **Format**:
  1.  **Subject Line**: Short (50 chars), Capitalized.
  2.  **Body**: Bullet points explaining _what_ and specifically _why_.

**Example**:

```text
Add media_type support to scraper and database

- Extracted `media_type` from GraphQL node (1=Image, 2=Video).
- Added `media_type` column to `posts` table (migration checked).
- Updated `PostData` type definition in `scrapeProfile.ts`.
```

## 2. Documentation Discipline

Documentation is not "fire and forget". It must be kept in sync with code.

- **Task Completion**: When you finish a task, ask: "Did I change architecture, add a feature, or change data shapes?"
  - **Yes**: Update `docs/STATE.md` (Capabilities section).
  - **Yes**: Update `docs/CODEBASE_MAP.md` (if new files added).
  - **Yes**: Update `docs/GLOSSARY.md` (if new terms introduced).
- **ADRs**: If you make a decision that affects _how_ we build (e.g., "Switching from SQLite to DuckDB"), create an ADR in `docs/adr/`.

## 3. Coding Standards

- **Network Interception**: Always prefer `page.waitForResponse` over DOM selectors (`page.$` or `locator`) for data extraction. Use `src/curator/selectors.ts` only for navigation interactions (clicks, scrolling).
- **Database Migrations**:
  - Never modify existing migration strings if they have run on production.
  - Append new `CREATE TABLE` or `ALTER TABLE` statements at the end of `runMigrations()` in `src/db/migrations.ts`.
  - Wrap `ALTER TABLE` in `try/catch` to ensure idempotency (re-running properly avoids crashing if column exists).
- **Type Safety**:
  - **Use Shared Types**: Define data structures used by both Client and Server in `shared/types.ts`.
  - Avoid `any`.
  - Define types for API responses (like `PostData`) explicitly.
- **Frontend / PWA**:
  - **Styling**:
    - Use external CSS files (`client/src/styles/components/`). **No** inline styles.
    - Use **Tokens** (`var(--color-primary)`, `var(--space-4)`) for consistency. Avoid hardcoded hex/px values.
  - **Components**: Keep components small. Place shared logic in `hooks/`.

## 4. Agent Etiquette

- **Read `AGENT.md` First**: Before starting any task, refresh your context.
- **Plan First**: Propose your changes (creates `implementation_plan.md`) before editing files.
- **Verify**: Always run `npm run build` after changes.

## 5. Tooling & Formatting

- **Prettier**: The codebase is automatically formatted using Prettier.
- **Git Hooks**: We use **Husky** + **lint-staged**. Staged files are automatically formatted on commit (pre-commit hook).
- **VS Code**: "Format on Save" is configured in `.vscode/settings.json`. Please ensure your editor respects this.

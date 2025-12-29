# ADR-0005: Object Spreading for Data Mapping

## Context

We discovered a bug where new fields added to the scraper (e.g., `aiScore`) were not being persisted to the database because the mapping logic in `runCuration.ts` required manual white-listing of every property. This led to silent data loss when the scraper definition evolved but the consumer logic was not updated.

## Decision

We decided to use **Object Spreading (`...rest`)** when mapping data from the scraper's `PostData` to the database's `Post` model.

Instead of constructing the target object by picking fields one-by-one:

```typescript
return {
  field1: source.field1,
  field2: source.field2,
  // field3 is forgotten!
};
```

We now use:

```typescript
const { transform1, transform2, ...rest } = source;
return {
  ...rest,
  field1: transform1,
  field2: transform2,
};
```

## Consequences

- **Pros**:
  - **Future-Proof**: Any new primitive field added to `PostData` is automatically passed through to the persistence layer.
  - **Maintainability**: Reduces boilerplate code in the mapping layer.
  - **Safety**: The database layer (`repo.toDb`) acts as the final gatekeeper/schema definition, ensuring that we don't accidentally insert junk columns into SQLite (it ignores unknown fields).

- **Cons**:
  - **Implicit Flow**: It's less obvious which fields are being passed just by reading the mapping function.
  - **Transient Data**: Temporary fields added to `PostData` for internal runtime use will be passed to the `repo` layer unless explicitly destructured-out.

## References

- `src/curator/runCuration.ts`
- `src/db/repo.ts`

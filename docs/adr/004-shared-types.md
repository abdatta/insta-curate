# 4. Use Shared Types for Client-Server Contract

Date: 2025-12-19

## Status

Accepted

## Context

Our application has a TypeScript backend (Express) and a TypeScript frontend (Preact). We were experiencing bugs where the backend returned data in snake_case (matching the DB), but the frontend expected camelCase (matching TypeScript conventions). Duplicate type definitions existed in both projects, leading to drift.

## Decision

We will create a `shared/` directory to host TypeScript interfaces and Enums that are common to both the Client and Server.

1.  **Single Source of Truth**: The `shared/types.ts` file defines the API response shape.
2.  **DTO Pattern**: The server is responsible for mapping internal database entities (e.g., proper Dates, snake_case DB columns) to the shared "Data Transfer Object" shape (e.g. ISO strings for dates, camelCase fields) before sending.
3.  **Strict Enums**: Shared Enums (like `MediaType`) ensure magic numbers (1, 2, 8) are named consistently across the stack.

## Consequences

- **Pros**:
  - Compile-time safety across the network boundary.
  - Zero duplication of interface definitions.
  - Eliminates "snake_case vs camelCase" bugs.
- **Cons**:
  - Requires strict discipline to update `shared` when fields change.
  - `shared/` must be included in both `tsconfig.json` configurations.

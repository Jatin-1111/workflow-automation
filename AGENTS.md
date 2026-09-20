<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Business Orbit — engineering conventions

This codebase is a reusable workflow engine, not a proposal app. It will grow to
cover many unrelated business processes, so every change is judged on whether it
still works when there are thirty workflows instead of two.

## Modularity

- **Feature-first structure.** Code lives with the feature it serves
  (`src/features/<feature>/`), not in global `components/` or `utils/` buckets.
  Shared code only moves to `src/lib/` once a second feature actually needs it.
- **The engine stays pure.** `src/lib/engine/` must not import React, Next.js,
  request context, or the database. It takes state in and returns the next state
  plus the events to persist. Everything about it must be testable by calling a
  function.
- **No workflow-specific logic in the engine or UI.** Anything true only of
  Proposal Creation belongs in a workflow template document, never in code. If
  you find yourself writing `if (workflow === 'proposal')`, the schema is missing
  a field — add the field.
- **Database access goes through a repository per collection.** No raw driver
  calls from components, actions, or route handlers.
- **Authorization lives in the data access layer**, next to the query. UI-level
  checks are for hiding controls, never for enforcing access.

## Manageability

- One responsibility per file. Prefer several small named modules over one file
  with a grab-bag of exports.
- Types are defined once, at the boundary they describe, and imported from there.
  Do not restate a shape inline.
- Name things after the domain (`workflowInstance`, `stage`, `assignee`), not
  after their mechanics (`data`, `item`, `obj`).
- Entity relationships use permanent IDs (`BO-USR-00001`), never display names.
- Every state change appends a timeline event. Timeline history is append-only —
  never update or delete an event.
- Keep modules honest about failure: validate at the boundary, and let the
  engine refuse an invalid transition rather than letting the UI prevent it.

# Business Orbit — Workflow Operating System

An internal workflow operating system for Business Orbit. People follow defined
processes through the platform instead of coordinating routine work through
WhatsApp, calls and direct messages. When somebody finishes their part, the
platform hands the work to whoever is next.

Built against the 56-section brief in `Business_Orbit_Base44_Master_Prompt.docx`.

---

## Running it

```bash
npm install
cp .env.example .env.local     # then set SESSION_SECRET
npm run db:up                  # MongoDB in Docker
npm run seed                   # organisation, workflows and demo data
npm run dev
```

All demo users share the password in `SEED_PASSWORD` (default `orbit1234`):

| Person  | Email                      | Access   | Holds |
|---------|----------------------------|----------|-------|
| Nitin   | nitin@businessorbit.in     | Admin    | Administrator, Management, Podcast Host |
| Tanu    | tanu@businessorbit.in      | Manager  | Proposal Content Owner, Final Approver, Podcast Producer |
| Harnoor | harnoor@businessorbit.in   | Employee | Sales, Content Writer |
| Ananya  | ananya@businessorbit.in    | Employee | Proposal Designer, QC Owner, Video Editor |

Other commands:

```bash
npm test             # unit and workflow tests
npm run walkthrough  # replays a proposal end to end and prints its timeline
npm run seed -- --reset
npm run db:down
```

---

## What this actually is

The product is **a workflow engine, a personal work dashboard, and the
management views over them** — not a proposal app. Proposal Creation and
Podcast Production are both configuration.

```
Business Orbit
  └─ Major Project        Startup Mela 2027
      └─ Workflow          Proposal Creation        (the repeatable process)
          └─ Instance       Proposal — ABC Technologies
              └─ Task        Design & Formatting    (assigned to a person)
```

### The engine

`src/lib/engine/` is a pure state machine. No React, no Next.js, no database:
operations take the current state and return either a typed refusal or the next
state plus the records to persist. It cannot allocate ids, which is what keeps
it honest — it emits drafts and `src/lib/workflow/persist.ts` gives them ids.

Routing is deterministic. The next stage comes from the template, never from a
judgement call (§51).

### Stages name roles, not people

A stage declares **assignee sources** and takes their union:

```ts
{ mode: 'role', roleId } | { mode: 'users', userIds }
| { mode: 'initiator' } | { mode: 'stage_assignee', stageKey }
```

Three requirements fall out of this for free: a two-owner stage, dispatch
returning to whoever raised the request, and a revision going back to whoever
actually did the work rather than whoever holds the role today.

This is why a person leaving is an admin action, not a development task: point
the role at somebody else in **Admin → People** and every workflow follows.

---

## What is in this release

- Login, sessions, and three permission tiers enforced in the data layer
- **My Work** — every task assigned to you across all projects and workflows,
  in six sections, with search, filters, four groupings and three sorts
- **Task detail** — instructions, earlier stages' work, files, checklist,
  comments, history, and the actions that move the workflow on
- Versioned file upload and download, scoped to people involved in the workflow
- Approve / Request Changes, with a mandatory comment and per-stage routing for
  where rejected work goes
- **Management overview** — active work, pending approvals, overdue, stuck work
  against SLA, project status, upcoming deadlines
- **Team workload** and per-person drill-down; **project dashboards**
- In-app notifications, user profile, and an admin panel for people and roles
- Two complete workflows: Proposal Creation (7 stages) and Podcast Production
  (11 stages), both running on the same engine
- **Workflow Builder** — create a process, add, reorder, duplicate and remove
  stages, configure roles, fields, files, checklists, deadlines, approvals and
  routing, then publish it. Editing a published workflow starts a new version;
  work already running keeps the version it began on.
- **Conditional stages** — a stage can be set to run only when what the
  workflow recorded earlier says it should. A stage that does not apply is
  skipped, and the skip is recorded rather than passed over silently.

---

## What is NOT in this release

Stated plainly so nothing here is a surprise.

| Not built | Where it stands |
|---|---|
| **Workflow versioning enforcement** (§38) | Instances pin the version they started on and always read that version, so running work is already safe. What is missing is the UI for publishing v2 of a template. |
| **Global search** (§48) | Search exists within My Work only. |
| **Reports** | Not started. |
| **Email / WhatsApp notification** (§41) | In-app only, as the brief specifies. |

**The honest framing:** an administrator can now build and publish a working
process without a developer. Demo that first — creating a workflow in the
builder and watching the engine run it is the whole product in one sitting.

---

## Verification

`npm test` covers 88 tests, including two that matter more than the rest:

- `proposal-workflow.test.ts` drives all 28 steps of the brief's own acceptance
  scenario (§55) through the engine with no UI, and asserts the resulting
  timeline matches §33 exactly.
- `podcast-workflow.test.ts` drives an entirely different 11-stage process
  through the same engine, and asserts the two workflows share no stage key but
  `quality_check` and no workflow role at all.

Adding the Podcast workflow touched only `src/lib/seed/`. Nothing in
`src/lib/engine/`, `src/features/`, `src/app/` or `src/lib/db/` changed.

A third workflow, Speaker Onboarding, was then built entirely through the
Workflow Builder with no code at all, published, and driven to completion by
the engine — rejection routing included. A conditional stage added to it in
the builder was then shown taking both routes: run when the answer required
it, skipped and recorded when it did not.

---

## Before this carries real work

- **File storage is local disk.** `src/lib/files/storage.ts` is shaped like
  object storage, so moving to S3 is a change to that one file — but as it
  stands, uploads do not survive a container restart without a volume and will
  not work across multiple instances.
- **`SESSION_SECRET` must be set** to a real random value per environment.
- **MongoDB runs unauthenticated-in-Docker for development.** Production needs
  proper credentials, TLS and backups.
- Roles with nobody assigned will stall any workflow routing to them. The engine
  refuses rather than stranding work, and **Admin → Role coverage** flags them
  in red before it happens.

---

## Conventions

`AGENTS.md` holds the engineering rules this codebase is held to. The one that
matters most: if you find yourself writing `if (workflow === 'proposal')`, the
schema is missing a field — add the field.

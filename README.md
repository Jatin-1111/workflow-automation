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
npm run reminders    # sends deadline and overdue notices (see below)
npm run seed -- --reset
npm run db:down
```

### Scheduling the reminders

Two of §41's notifications react to time passing rather than to somebody
acting — `deadline_approaching` and `task_overdue` — so they are the only
thing here that has to be woken up.

**Overdue work is visible without any of this.** Whether a task is overdue is
derived from its deadline against the clock every time it is read, never
stored, so the Overdue section on My Work, the overdue tile and Stuck work on
the management dashboard, and SLA breach on every row are all live and correct
with the scheduler switched off entirely. Nothing goes stale waiting for a job
to run.

What the scheduler adds is narrower: a timestamped record that somebody was
told, which derived state cannot give you, and the "due soon" warning, which
is the one thing no screen otherwise says.

`GET /api/cron/reminders` does the work. It authorises against `CRON_SECRET`
as a bearer token (or a `?key=` parameter for schedulers that cannot set
headers) and refuses outright when no secret is set, rather than falling open.
`npm run reminders` does the same thing from a shell. Running it repeatedly is
harmless: what has already been said is read back before anything is written,
so nobody is told the same thing twice.

**On Vercel**, `vercel.json` holds a daily run at 03:00 UTC (08:30 IST), which
is all the Hobby plan allows — it caps cron at once per day and fires anywhere
inside the hour. Vercel sends `Authorization: Bearer $CRON_SECRET` on its own
once that variable is set in the project, so nothing needs changing.

**Self-hosted**, a crontab entry, systemd timer or Windows scheduled task can
run it as often as you like:

```
*/15 * * * * cd /srv/business-orbit && npm run reminders
```

Once a day is poor cadence — an overdue notice can be most of a day late, and
a "due soon" window is half a stage's own allowance, so most are missed
outright. That matters less than it sounds while notifications are in-app
only: they can only be read by opening the platform, and by then My Work is
already showing the overdue work more plainly than the bell does.

**When notifications leave the app, this changes.** The day an email, Slack or
WhatsApp channel is added, the scheduler becomes the thing that makes it work,
because reaching somebody who is not looking is the entire point. At that
stage, point any external scheduler at the endpoint every fifteen minutes —
cron-job.org and Cloudflare Workers both do this on a free tier — or move to
Vercel Pro, where `*/15 * * * *` simply works.

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
- **Global search** across people, projects, workflows, work, stages and
  files, scoped to what the person searching may see. Pasting a permanent ID
  goes straight to it.
- **Task reassignment** for managers and administrators, with each person's
  current load shown at the point of choosing, and the reason recorded
- **Reports** — how long work takes, which stage holds it up, how often it
  comes back, and who is carrying it, over a chosen period and exportable as
  CSV. Measured from the stage records rather than estimated.
- **Getting started** — a role-aware introduction on first login, a setup card
  that reads the real state of the organisation, teaching empty states, a Help
  page carrying the four-level model, and a Practice Run workflow in a Sandbox
  project for learning the product on the real machinery

---

## What is NOT in this release

Stated plainly so nothing here is a surprise.

| Not built | Where it stands |
|---|---|
| **Workflow versioning enforcement** (§38) | Instances pin the version they started on and always read that version, so running work is already safe. What is missing is the UI for publishing v2 of a template. |
| **Email / WhatsApp notification** (§41) | In-app only, as the brief specifies. |

**The honest framing:** an administrator can now build and publish a working
process without a developer. Demo that first — creating a workflow in the
builder and watching the engine run it is the whole product in one sitting.

---

## Verification

`npm test` covers 197 tests, including three that matter more than the rest:

- `proposal-workflow.test.ts` drives all 28 steps of the brief's own acceptance
  scenario (§55) through the engine with no UI, and asserts the resulting
  timeline matches §33 exactly.
- `podcast-workflow.test.ts` drives an entirely different 11-stage process
  through the same engine, and asserts the two workflows share no stage key but
  `quality_check` and no workflow role at all.

Adding the Podcast workflow touched only `src/lib/seed/`. Nothing in
`src/lib/engine/`, `src/features/`, `src/app/` or `src/lib/db/` changed.

- `workflow.integration.test.ts` runs the engine, the persistence layer and
  MongoDB together against its own database, because most of this project's
  defects have lived between those rather than inside any one of them.

A third workflow, Speaker Onboarding, was then built entirely through the
Workflow Builder with no code at all, published, and driven to completion by
the engine — rejection routing included. A conditional stage added to it in
the builder was then shown taking both routes: run when the answer required
it, skipped and recorded when it did not.

---

## Before this carries real work

- **File storage defaults to local disk.** Fine for development; it does not
  survive a container restart without a volume, does not work across multiple
  instances, and does not work at all on a serverless host. Set the Cloudinary
  variables to move it (see below).
- **`SESSION_SECRET` must be set** to a real random value per environment.
- **`CRON_SECRET` must be set** or `/api/cron/reminders` answers 503 and the
  scheduled run does nothing. It refuses rather than falling open, so the
  failure is silent unless you look at the cron logs.
- **MongoDB runs unauthenticated-in-Docker for development.** Production needs
  proper credentials, TLS and backups.
- Roles with nobody assigned will stall any workflow routing to them. The engine
  refuses rather than stranding work, and **Admin → Role coverage** flags them
  in red before it happens.

---

## File storage

Local disk by default, Cloudinary when `CLOUDINARY_CLOUD_NAME`, `_API_KEY` and
`_API_SECRET` are all set. Nothing else changes: callers hold an opaque storage
key and never learn which store answered. `npm run seed` prints which one it
cleared.

Two things about the Cloudinary backend are deliberate and worth not undoing:

**Everything is uploaded as `raw`, including PDFs and images.** Nothing here
transforms an asset, so the image pipeline buys nothing — and raw sidesteps
both the format/public_id asymmetry images have and the account-level setting
that blocks PDF delivery through the image pipeline.

**Files are read through the download API, not a signed delivery URL.**
Signed delivery is the tempting one — CDN-served, no api_key — but it answers
401 for an authenticated asset on anything below the Advanced plan, where
delivery needs token or cookie auth. Every delivery variant was tried against
a real account; only `private_download_url` returns the bytes. If file volume
ever makes the API endpoint a bottleneck, the honest trade is a plan that
supports token auth, not public delivery.

**Cloudinary URLs never reach a browser.** Files are read server-side and
streamed through `/api/files/[fileId]`, which is where the viewer can actually
be checked — it returns 404 rather than 403 to someone outside the workflow,
because whether a file exists is not theirs to learn. Cloudinary cannot express
that rule: a signed URL is a bearer token for one asset and says nothing about
who is asking, and per-viewer rules need token auth, which is an Advanced-plan
feature. Assets are uploaded `authenticated` anyway, so a leaked public id is
not itself a way in. Serving a Cloudinary URL directly would be faster and
cheaper, and would silently replace the access model with "did you ever see
the link".

`CLOUDINARY_FOLDER` namespaces the deployment. **Set it per environment**:
`seed --reset` deletes everything under that folder, so staging sharing a
folder with production would take production with it.

---

## Conventions

`AGENTS.md` holds the engineering rules this codebase is held to. The one that
matters most: if you find yourself writing `if (workflow === 'proposal')`, the
schema is missing a field — add the field.

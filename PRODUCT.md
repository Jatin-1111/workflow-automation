# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People inside one company (Business Orbit) who follow defined processes through the platform instead of coordinating routine work over WhatsApp, calls and direct messages. Three audiences share the app:

- **Employees** open it many times a day to see what is waiting on them, do their stage, and hand the work on.
- **Managers** approve work, reassign it and watch their team's load.
- **Administrators** set up people, roles, workflows and projects.

Desktop-first, used for hours at a time; phone support matters but is secondary.

## Product Purpose

An internal workflow operating system. A workflow is built once as a template; running it assigns each stage to the right role, and when somebody finishes their part the platform hands the work to whoever is next. Success is nobody asking "who has this?" in a chat, and nothing sitting overdue unnoticed.

## Positioning

The platform, not a person, moves the work on, and every state change is on an append-only timeline. It is a reusable engine: Proposal Creation, Blog Post and others are templates, never special cases in code.

## Operating Context

Work is organised as Projects, Workflows, running instances and stages. Surfaces: My Work (buckets such as Needs action, Waiting, Overdue), Board (kanban by stage), Management Overview (counts, stuck work, team workload), Projects, Team, Reports, Workflows (templates and versions), Admin (people, roles, organisation), Notifications, Search, Help. Entities carry permanent IDs such as BO-USR-00001.

## Capabilities and Constraints

- Next.js (breaking-changes version; read `node_modules/next/dist/docs/` first), React, Tailwind v4, MongoDB.
- The engine in `src/lib/engine` stays pure; no workflow-specific logic in UI; authorisation lives in the data layer; code is feature-first under `src/features/`.
- Terminology: People, Roles, Projects, Workflows, Stages, Assignees. One term per concept.
- Overdue is derived from deadlines at read time, never stored.

## Brand Commitments

Name: Business Orbit. Existing mark is an orbit glyph. No other brand assets are binding. The user asked for a sidebar on the left with data on the right as the core structure of the redesign.

## Evidence on Hand

Local demo data exists (3 people, 1 project, 2 workflows, a handful of tasks). No customer logos, testimonials or benchmarks exist and none may be invented.

## Product Principles

- Plain words over system words: say what happened and what to do.
- One decision per screen; the primary action is obvious.
- The platform tells you, you do not have to keep checking.
- Every state is legible without hover, and works from the keyboard.
- Nothing about a specific workflow is hard-coded into the interface.

## Accessibility & Inclusion

Visible keyboard focus, contrast of at least 4.5:1 for text, reduced-motion respected, usable at 200% zoom.

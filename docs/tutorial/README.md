# Regenerating the user guide

`Business-Orbit-User-Guide.pdf` at the repository root is built from real
screenshots of the running product on a fresh install. Nothing in it is a
mock-up, which is the point: if a screen changes, the guide is wrong until
it is rebuilt.

## What you need

- The dev server running on `http://localhost:3000`
- Google Chrome installed (the capture driver talks to it over the
  DevTools Protocol — there is no headless-browser dependency)
- Python with `reportlab` and `pillow`

## Rebuilding, start to finish

This **wipes the local database**. Do not point it at anything real.

```bash
# 1. An empty system with one administrator
npx tsx --env-file=.env.local docs/tutorial/wipe.ts
ADMIN_NAME="Nitin" ADMIN_EMAIL="nitin@businessorbit.in" \
  ADMIN_PASSWORD="Quibbling47!" npm run bootstrap:admin

# 2. Walk the product, capturing as it fills up
node docs/tutorial/capture-1.mjs    # empty states
node docs/tutorial/capture-2.mjs    # add people
node docs/tutorial/capture-3.mjs    # roles and a project
node docs/tutorial/capture-4.mjs    # assign the roles
npx tsx --env-file=.env.local docs/tutorial/data-workflow.ts
node docs/tutorial/capture-5.mjs    # the builder, then publish
node docs/tutorial/capture-6.mjs    # the employee's first task
node docs/tutorial/capture-7.mjs    # complete it, hand it on
npx tsx --env-file=.env.local docs/tutorial/retime.ts
node docs/tutorial/capture-8.mjs    # the approval
node docs/tutorial/capture-10.mjs   # more runs, then oversight
node docs/tutorial/capture-11.mjs   # notifications, profile, search, help
node docs/tutorial/capture-12.mjs   # reassignment and the admin screens

# 3. Build the document
python docs/tutorial/build-pdf.py
```

Screenshots land in `docs/tutorial/shots/` and are gitignored — they are
output, not source.

## Restoring the demo data afterwards

```bash
npm run seed -- --reset
```

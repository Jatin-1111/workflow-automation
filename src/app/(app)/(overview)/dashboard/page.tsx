/**
 * MANAGEMENT OVERVIEW (spec §16).
 *
 * The operational screen for managers and administrators: what is running,
 * what is stuck, who is carrying what, and what falls due next.
 *
 * The grid is built so every row ends on one line. Stuck work is the tile the
 * page is for, so it is the wide one; workload and deadlines stack beside it
 * and together match its height; project status runs the full width beneath.
 * A tile that is short for want of content stretches rather than leaving a
 * gap, and its empty message sits in the middle of what it was given.
 */

import Link from "next/link";
import { requireCapability } from "@/lib/auth/dal";
import { getManagementOverview } from "@/features/management/queries";
import { OverviewFilterBar } from "@/features/management/overview-filters";
import { parseOverviewFilters } from "@/features/management/filters";
import { listDepartments } from "@/lib/db/repositories/departments";
import { listProjects } from "@/lib/db/repositories/projects";
import { listRoles } from "@/lib/db/repositories/roles";
import { listUsers } from "@/lib/db/repositories/users";
import { listActiveTemplates } from "@/lib/db/repositories/workflow-templates";
import {
  Activity,
  CalendarClock,
  CheckCheck,
  CircleCheckBig,
  CircleSlash,
  FolderKanban,
  Stamp,
  TriangleAlert,
} from "lucide-react";
import { StatStrip, StatTile } from "@/features/management/stat-tile";
import { QuickReassign } from "@/features/management/quick-reassign";
import { EmptyRow, Section } from "@/features/management/section";
import { formatDeadline } from "@/features/my-work/format";
import { TileListPanel } from "@/features/management/tile-list";
import {
  TILE_LABELS,
  parseOverviewTile,
  tileHref,
  type OverviewTile,
} from "@/features/management/overview-tiles";
import type { StatSize, StatTone } from "@/features/management/stat-tile";
import { WorkloadList } from "@/features/management/workload-list";
import { RunLine } from "@/features/ui/run-line";
import { rowLinkClass, tbodyClass, tdClass, tdNumClass, theadClass, thClass, thNumClass } from "@/features/ui/primitives";
import { formatWaiting } from "@/lib/workflow/metrics";
import type { LucideIcon } from "lucide-react";

/** How each headline number looks; what it counts lives with the rule. */
const TILE_LOOK: Record<OverviewTile, { tone: StatTone; icon: LucideIcon }> = {
  active: { tone: "progress", icon: Activity },
  approvals: { tone: "action", icon: Stamp },
  overdue: { tone: "alert", icon: TriangleAlert },
  due_today: { tone: "action", icon: CalendarClock },
  blocked: { tone: "alert", icon: CircleSlash },
  completed_week: { tone: "good", icon: CircleCheckBig },
  completed: { tone: "good", icon: CheckCheck },
};

/**
 * What a manager reads first. The two things they act on lead and are large;
 * today's and running work sit in the middle; the rest is history or a count
 * and is quiet. The order is the page's priority, not the order of the rules.
 */
const RIBBON_ORDER: OverviewTile[] = [
  "overdue",
  "approvals",
  "due_today",
  "active",
  "blocked",
  "completed_week",
  "completed",
];

const RIBBON_SIZE: Record<OverviewTile, StatSize> = {
  overdue: "lead",
  approvals: "lead",
  due_today: "base",
  active: "base",
  blocked: "quiet",
  completed_week: "quiet",
  completed: "quiet",
};

export default async function ManagementDashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  await requireCapability("management.view_dashboard");
  const now = new Date();
  const params = await searchParams;
  const filters = parseOverviewFilters(params);
  const open = parseOverviewTile(params);

  const [overview, projects, templates, people, roles, departments] =
    await Promise.all([
      getManagementOverview(now, filters, open),
      listProjects(),
      listActiveTemplates(),
      listUsers(),
      listRoles(),
      listDepartments(),
    ]);
  const { counts } = overview;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-[1.625rem] font-bold leading-8 sm:text-[2rem] sm:leading-9 tracking-[-0.02em]">
          Management Overview
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
          Business Orbit operations at{" "}
          {now.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          .
        </p>
      </div>

      <OverviewFilterBar
        filters={filters}
        open={open}
        projects={projects.map((p) => ({ value: p.projectId, label: p.name }))}
        workflows={templates.map((t) => ({
          value: t.workflowId,
          label: t.name,
        }))}
        people={people
          .filter((person) => person.status === "active")
          .map((person) => ({ value: person.userId, label: person.name }))}
        roles={roles.map((r) => ({ value: r.roleId, label: r.name }))}
        departments={departments.map((d) => ({
          value: d.departmentId,
          label: d.name,
        }))}
      />

      {/* Each number opens the list it counts, right here. */}
      <StatStrip columns="ribbon">
        {RIBBON_ORDER.map((tile) => (
          <StatTile
            key={tile}
            label={TILE_LABELS[tile]}
            value={counts[tile]}
            tone={TILE_LOOK[tile].tone}
            icon={TILE_LOOK[tile].icon}
            href={tileHref(filters, tile, open)}
            selected={tile === open}
            size={RIBBON_SIZE[tile]}
          />
        ))}
        <StatTile
          label="Projects"
          value={overview.projects.length}
          icon={FolderKanban}
          href="/projects"
          size="quiet"
        />
      </StatStrip>

      {overview.tileList ? (
        <TileListPanel list={overview.tileList} filters={filters} now={now} />
      ) : null}

      {/* One column below `lg`, with an explicit track so a wide table cannot
          stretch the page past a phone's edge. From `lg` the two tiles share a
          row and stretch to the taller, so neither leaves a gap. */}
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-12">
        <Section
          fill={overview.stuck.length > 0}
          className={`lg:col-span-8 ${overview.stuck.length === 0 ? 'lg:self-start' : ''}`}
          title="Stuck work"
          count={overview.stuck.length}
          description="Past its deadline or past the time its stage allows."
        >
          {overview.stuck.length === 0 ? (
            <EmptyRow>
              Nothing is stuck. Every stage is inside its window.
            </EmptyRow>
          ) : (
            /* A container, not the viewport, decides the row's shape: the same
               tile is wide on a big screen and narrow beside the sidebar. */
            <ul className="@container flex max-h-[40rem] min-h-0 flex-1 flex-col divide-y divide-border overflow-y-auto">
              {overview.stuck.map((item) => (
                <li
                  key={item.taskId}
                  className="transition-ui flex flex-1 flex-col justify-center px-5 py-4 hover:bg-surface-sunken"
                >
                  {/* The row is a link; the reassign control sits below it
                      rather than inside, because a button nested in a link is
                      neither. */}
                  <Link
                    href={`/tasks/${item.taskId}`}
                    className="grid items-center gap-x-8 gap-y-3 @2xl:grid-cols-[minmax(0,1fr)_minmax(15rem,20rem)_auto]"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-muted [overflow-wrap:anywhere]">
                        {item.projectName}
                      </span>
                      <span className="mt-0.5 block text-base font-bold tracking-[-0.01em] [overflow-wrap:anywhere]">
                        {item.stageName}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted [overflow-wrap:anywhere]">
                        {item.instanceTitle} · with {item.assignees.join(", ")}
                      </span>
                    </span>

                    {item.route.length > 0 ? (
                      <RunLine stops={item.route} className="@2xl:order-none order-3" />
                    ) : null}

                    <span className="flex flex-wrap items-baseline gap-x-2 @2xl:block @2xl:text-right">
                      <span className="block text-sm font-bold text-status-overdue">
                        {formatWaiting(item.hoursWaiting)} waiting
                      </span>
                      <span className="block text-xs text-subtle">
                        {item.slaHours ? `SLA ${item.slaHours}h` : "No SLA set"}
                        {item.overdue ? " · overdue" : ""}
                      </span>
                    </span>
                  </Link>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <QuickReassign
                      taskId={item.taskId}
                      currentAssignees={item.assigneeIds}
                      people={overview.workload.map((person) => ({
                        userId: person.userId,
                        name: person.name,
                        openTasks: person.active,
                      }))}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <Section
            title="Team workload"
            description="Open work per person. Click one to see it."
          >
            <div className="max-h-[22rem] overflow-y-auto">
              <WorkloadList rows={overview.workload} />
            </div>
          </Section>

          <Section
            fill
            className="flex-1"
            title="Upcoming deadlines"
            count={overview.upcoming.length}
          >
            {overview.upcoming.length === 0 ? (
              <EmptyRow>Nothing is scheduled.</EmptyRow>
            ) : (
              <ul className="divide-y divide-border">
                {overview.upcoming.map((item) => {
                  const deadline = formatDeadline(item.dueAt, now);
                  return (
                    <li key={item.taskId}>
                      <Link
                        href={`/tasks/${item.taskId}`}
                        className="transition-ui flex items-center gap-3 px-5 py-3 hover:bg-surface-sunken"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {item.stageName}
                          </span>
                          <span className="block truncate text-xs text-subtle">
                            {item.instanceTitle} · {item.assignees.join(", ")}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-medium text-muted">
                          {deadline.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>

        <Section
          className="lg:col-span-12"
          title="Project status"
          count={overview.projects.length}
        >
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className={theadClass}>
                <th scope="col" className={thClass}>Project</th>
                <th scope="col" className={thNumClass}>Active</th>
                <th scope="col" className={thNumClass}>Approvals</th>
                <th scope="col" className={thNumClass}>Overdue</th>
                <th scope="col" className={thNumClass}>Completed</th>
              </tr>
            </thead>
            <tbody className={tbodyClass}>
              {overview.projects.map((project) => (
                <tr key={project.projectId}>
                  <td className={`${tdClass} min-w-40`}>
                    <Link
                      href={`/projects/${project.projectId}`}
                      className={`font-bold text-foreground underline-offset-4 hover:text-accent hover:underline [overflow-wrap:anywhere] ${rowLinkClass}`}
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className={tdNumClass}>{project.activeInstances}</td>
                  <td
                    className={`${tdNumClass} ${
                      project.pendingApprovals > 0
                        ? "font-semibold text-status-action"
                        : "text-muted"
                    }`}
                  >
                    {project.pendingApprovals}
                  </td>
                  <td
                    className={`${tdNumClass} ${
                      project.overdueTasks > 0
                        ? "font-bold text-status-overdue"
                        : "text-muted"
                    }`}
                  >
                    {project.overdueTasks}
                  </td>
                  <td className={`${tdNumClass} text-muted`}>
                    {project.completedInstances}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";

export const metadata = { title: "Overview" };

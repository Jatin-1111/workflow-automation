/**
 * The interface kit.
 *
 * One definition per repeated element, so a button, a status or a panel looks
 * the same wherever it appears. The brief asks for a restrained enterprise
 * interface (spec §50): the restraint is easier to hold when there is one
 * place to hold it.
 */

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

/* -------------------------------------------------------------------------
 * The shared rules
 *
 * Radius says what a thing is: `md` for anything you operate (buttons,
 * inputs, chips), `xl` for anything that contains (panels, cards). Nothing
 * else, so the interface reads as one set of parts.
 *
 * Focus is `focus-visible` only. A ring on every mouse click is noise, and
 * globals.css already draws the keyboard outline — components add a ring on
 * top of it only where the outline alone is hard to see.
 * ---------------------------------------------------------------------- */

export const RADIUS_CONTROL = 'rounded-md'
export const RADIUS_CONTAINER = 'rounded-xl'

/** Icons come in three sizes and one stroke, aligned to the text beside them. */
export const ICON_SIZES = { sm: 14, md: 16, lg: 20 } as const

export function Icon({
  as: Glyph,
  size = 'md',
  className = '',
}: {
  as: LucideIcon
  size?: keyof typeof ICON_SIZES
  className?: string
}) {
  return (
    <Glyph
      size={ICON_SIZES[size]}
      strokeWidth={1.75}
      aria-hidden
      className={`shrink-0 ${className}`}
    />
  )
}

/** A block standing in for content still being fetched. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden className={`skeleton block ${className}`} />
}

/* -------------------------------------------------------------------------
 * Buttons
 * ---------------------------------------------------------------------- */

type ButtonTone = 'primary' | 'secondary' | 'quiet' | 'danger'
type ButtonSize = 'sm' | 'md'

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-ui ' +
  // Touch needs 44px; a pointer does not, so the floor lifts only on small
  // screens rather than making every desktop toolbar chunky.
  'max-sm:min-h-11 ' +
  'active:translate-y-px ' +
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0'

const BUTTON_TONES: Record<ButtonTone, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary:
    'border border-border-strong bg-surface text-foreground hover:border-accent hover:bg-accent-soft',
  quiet: 'text-muted hover:bg-surface-sunken hover:text-foreground',
  danger:
    'border border-border-strong bg-surface text-status-overdue hover:border-status-overdue hover:bg-status-overdue-soft',
}

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-9 px-4 text-sm',
}

export function buttonClass(tone: ButtonTone = 'secondary', size: ButtonSize = 'md') {
  return `${BUTTON_BASE} ${BUTTON_TONES[tone]} ${BUTTON_SIZES[size]}`
}

export function Button({
  tone = 'secondary',
  size = 'md',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ButtonTone
  size?: ButtonSize
}) {
  return <button {...props} className={`${buttonClass(tone, size)} ${className}`} />
}

/**
 * A button that is only an icon.
 *
 * `label` is required rather than optional: an icon-only control with no
 * accessible name is invisible to a screen reader, and making the prop
 * optional is how that happens.
 */
export function IconButton({
  as: glyph,
  label,
  tone = 'quiet',
  className = '',
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  as: LucideIcon
  label: string
  tone?: ButtonTone
}) {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={`${BUTTON_BASE} ${BUTTON_TONES[tone]} size-8 max-sm:size-11 p-0 ${className}`}
    >
      <Icon as={glyph} size="md" />
    </button>
  )
}

/* -------------------------------------------------------------------------
 * Form controls
 * ---------------------------------------------------------------------- */

export const fieldClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-subtle transition-ui max-sm:min-h-11 hover:border-border-strong focus-visible:border-accent'

export const controlClass =
  'h-9 rounded-md border border-border bg-surface px-2.5 text-sm text-foreground transition-ui max-sm:min-h-11 hover:border-border-strong focus-visible:border-accent'

export function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-medium text-muted">{children}</span>
}

/* -------------------------------------------------------------------------
 * Status
 * ---------------------------------------------------------------------- */

export type StatusTone =
  | 'neutral'
  | 'progress'
  | 'action'
  | 'waiting'
  | 'overdue'
  | 'complete'

const STATUS_TONES: Record<StatusTone, string> = {
  neutral: 'bg-status-neutral-soft text-status-neutral',
  progress: 'bg-status-progress-soft text-status-progress',
  action: 'bg-status-action-soft text-status-action',
  waiting: 'bg-status-waiting-soft text-status-waiting',
  overdue: 'bg-status-overdue-soft text-status-overdue',
  complete: 'bg-status-complete-soft text-status-complete',
}

/**
 * A state, not a control.
 *
 * Tinted and borderless so it never reads as a button somebody should press —
 * an outlined box at the end of a row invites exactly that mistake.
 */
export function Pill({
  tone = 'neutral',
  children,
}: {
  tone?: StatusTone
  children: React.ReactNode
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_TONES[tone]}`}
    >
      {children}
    </span>
  )
}

/** A small count beside a heading, without competing with it. */
export function Count({ value }: { value: number }) {
  return <span className="ml-2 text-sm font-normal tabular-nums text-subtle">{value}</span>
}

/* -------------------------------------------------------------------------
 * Page and panel structure
 * ---------------------------------------------------------------------- */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function Panel({
  title,
  count,
  description,
  actions,
  children,
  className = '',
}: {
  title?: string
  count?: number
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`rise overflow-hidden ${RADIUS_CONTAINER} border border-border bg-surface ${className}`}
    >
      {title ? (
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">
              {title}
              {count !== undefined ? <Count value={count} /> : null}
            </h2>
            {description ? (
              <p className="mt-0.5 text-xs text-muted">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-10 text-center text-sm text-muted">{children}</p>
}

/** A breadcrumb trail, which is how every detail page states where it is. */
export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[]
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-x-2 text-xs">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-2">
          {index > 0 ? (
            <span aria-hidden className="text-subtle">
              /
            </span>
          ) : null}
          {item.href ? (
            <Link
              href={item.href}
              className="text-muted transition hover:text-foreground hover:underline"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-subtle">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

/* -------------------------------------------------------------------------
 * Tables
 * ---------------------------------------------------------------------- */

export const tableClass = 'w-full text-sm'
export const theadClass =
  'border-b border-border bg-surface-sunken text-left text-xs font-medium text-muted'
export const thClass = 'px-5 py-2.5 font-medium'
export const thNumClass = 'px-5 py-2.5 text-right font-medium'
export const tdClass = 'px-5 py-3 align-middle'
export const tdNumClass = 'px-5 py-3 text-right align-middle tabular-nums'
export const trClass = 'border-b border-border last:border-b-0 hover:bg-surface-sunken'

/**
 * An explanation of something genuinely confusing.
 *
 * Deliberately plain and deliberately rare: a hint on an obvious control is
 * clutter, which the brief asks against. These earn their place only where
 * people reliably get the concept wrong.
 */
export function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-border bg-surface-sunken px-3 py-2 text-xs leading-relaxed text-muted">
      {children}
    </p>
  )
}

/** An id shown for reference, kept quiet so it never competes with a name. */
export function Ref({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-xs text-subtle">{children}</span>
}

/** A titled panel with an optional count, used across the management views. */

export function Section({
  title,
  count,
  description,
  children,
}: {
  title: string
  count?: number
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">
          {title}
          {count !== undefined ? (
            <span className="ml-2 font-normal text-subtle">{count}</span>
          ) : null}
        </h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-sm text-muted">{children}</p>
}

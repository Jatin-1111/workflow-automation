'use client'

import { useActionState } from 'react'
import { login, type LoginState } from './actions'

const INITIAL_STATE: LoginState = {}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(login, INITIAL_STATE)

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </label>

      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-border bg-accent-soft px-3 py-2 text-sm text-status-overdue"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}

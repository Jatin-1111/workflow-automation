'use client'

import { buttonClass, fieldClass } from '@/features/ui/primitives'
import { PASSWORD, TEXT_LIMITS } from '@/lib/validation/bounds'
import { useActionState, useEffect, useRef } from 'react'
import { login, type LoginState } from './actions'

const INITIAL_STATE: LoginState = {}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(login, INITIAL_STATE)

  // Every refusal is a new state, so this opens the help each time one that
  // a forgotten password would cause comes back — including after somebody
  // closed it and tried again. Opened, never closed: what they chose to read
  // stays open.
  const help = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (state.forgotten && help.current) help.current.open = true
  }, [state])

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Email</span>
        <input
          type="email"
          name="email"
          defaultValue={state.email}
          maxLength={TEXT_LIMITS.email}
          autoComplete="email"
          required
          className={fieldClass}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          /* No minimum: this is not where a password is chosen, and a
             rule here would only announce the policy to a stranger. The
             maximum stops a megabyte being posted to be hashed. */
          maxLength={PASSWORD.max}
          className={fieldClass}
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
        className={buttonClass('primary', 'lg')}
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>

      {/* There was no way back from a forgotten password and no hint where
          to look; the owner of the system was stuck on exactly this. There
          is no email, so no reset link — the honest answer is who can help.
          Administrators are not named: this page is open to anybody. Opens
          by itself after a refusal that a forgotten password would cause. */}
      <details ref={help} className="group text-sm">
        <summary className="cursor-pointer list-none text-center font-medium text-accent hover:underline">
          Forgot your password?
        </summary>
        <div className="mt-3 space-y-2 rounded-md border border-border bg-surface-sunken px-3 py-2.5 text-muted">
          <p>
            Ask an administrator in your organisation to set a new one for you. They do it
            from <span className="font-medium text-foreground">Admin</span>, beside your name,
            and it lifts any wait your earlier attempts caused.
          </p>
          <p>
            Once you are in, change it to one only you know: open your profile from the top
            right of any page — your name, or just its first letter on a phone — then{' '}
            <span className="font-medium text-foreground">Change my password</span>.
          </p>
        </div>
      </details>
    </form>
  )
}

import { logout } from './actions'

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="text-sm text-muted transition hover:text-foreground"
      >
        Sign out
      </button>
    </form>
  )
}

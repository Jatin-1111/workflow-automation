import { logout } from './actions'

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="transition-ui whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold text-muted hover:bg-sidebar-hover hover:text-foreground active:scale-[0.98] max-lg:min-h-11"
      >
        Sign out
      </button>
    </form>
  )
}

import { LogOut } from 'lucide-react'
import { logout } from './actions'

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        title="Sign out"
        className="transition-ui whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-semibold text-muted hover:bg-sidebar-hover hover:text-foreground active:scale-[0.98] max-lg:min-h-11 lg:group-data-[sidebar=rail]/shell:flex lg:group-data-[sidebar=rail]/shell:size-9 lg:group-data-[sidebar=rail]/shell:items-center lg:group-data-[sidebar=rail]/shell:justify-center lg:group-data-[sidebar=rail]/shell:px-0"
      >
        <span className="lg:group-data-[sidebar=rail]/shell:sr-only">Sign out</span>
        <LogOut aria-hidden size={16} strokeWidth={1.75} className="hidden lg:group-data-[sidebar=rail]/shell:block" />
      </button>
    </form>
  )
}

import { createFileRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect, useState, type ReactNode } from 'react'
import { Loader2, LogOut, ShieldX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { getAdminRole } from '@/lib/admin.functions'

// Guard for every /admin route except the login page: a signed-in staff
// account is required before any admin screen renders. The check runs in the
// component (not beforeLoad) so a hard refresh can read the restored session
// from browser storage instead of failing during SSR.
export const Route = createFileRoute('/admin')({
  component: AdminLayout,
})

type GuardState = 'checking' | 'ok' | 'denied'

function AdminLayout() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [state, setState] = useState<GuardState>('checking')

  const isLogin = pathname === '/admin/login'

  useEffect(() => {
    if (isLogin) return
    let active = true
    setState('checking')
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
      if (!data.session) {
        navigate({ to: '/admin/login', search: { next: pathname }, replace: true })
        return
      }
        await getAdminRole()
        if (active) setState('ok')
      } catch {
        if (active) setState('denied')
      }
    })()
    return () => { active = false }
  }, [isLogin, pathname, navigate])

  // Keep the guard honest: a sign-out anywhere under /admin returns to login.
  useEffect(() => {
    if (isLogin) return
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') navigate({ to: '/admin/login', replace: true })
    })
    return () => data.subscription.unsubscribe()
  }, [isLogin, navigate])

  if (isLogin) return <Outlet />

  if (state === 'denied') {
    return (
      <div className="page-intro">
        <ShieldX className="size-8 text-destructive" />
        <h1>No staff access.</h1>
        <p className="text-muted-foreground">This account is not authorised for the admin panel. Ask the owner to add your account to the staff list.</p>
        <Button
          variant="editorial"
          className="mt-4"
          onClick={async () => {
            await supabase.auth.signOut()
            navigate({ to: '/admin/login', replace: true })
          }}
        >
          <LogOut className="size-3" /> Sign out
        </Button>
      </div>
    )
  }

  if (state === 'checking') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-label="Checking staff access" />
      </div>
    )
  }

  return <AdminFrame>{<Outlet />}</AdminFrame>
}

function AdminFrame({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="section">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <span className="eyebrow">Staff area · Fresh Frozen Food</span>
        <Button
          variant="text"
          onClick={async () => {
            await supabase.auth.signOut()
            navigate({ to: '/admin/login', replace: true })
          }}
        >
          <LogOut className="size-3" /> Sign out
        </Button>
      </div>
      {children}
    </div>
  )
}

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/integrations/supabase/client'
import { pageHead } from '@/lib/brand'

export const Route = createFileRoute('/admin/login')({
  head: () => pageHead('Staff sign in · Fresh Frozen Food', 'Staff sign-in for the Fresh Frozen Food admin panel.'),
  validateSearch: (search: Record<string, unknown>) => {
    const { next } = search
    return { next: typeof next === 'string' && next.startsWith('/admin') ? next : undefined } as { next?: string }
  },
  component: AdminLoginPage,
})

function AdminLoginPage() {
  const navigate = useNavigate()
  const next = Route.useSearch().next
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Already signed in? Go straight to the staff area.
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) navigate({ to: next ?? '/admin/debug', replace: true })
    })()
  }, [navigate, next])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Enter a valid email address.'); return }
    if (password.length < 6) { setError('Enter your password.'); return }
    setSubmitting(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError(signInError.status === 400 ? 'That email or password is not correct.' : 'Sign-in is unavailable right now. Please try again.')
        return
      }
      navigate({ to: next ?? '/admin/debug', replace: true })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-intro">
      <span className="eyebrow text-primary">Staff area</span>
      <h1>Sign in.</h1>
      <p className="max-w-md text-muted-foreground">This panel is for Fresh Frozen Food staff. Customer accounts cannot access it — access is granted by role, not by sign-up.</p>
      <form onSubmit={submit} className="mt-6 grid w-full max-w-sm gap-4 text-left" noValidate>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button variant="editorial" type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}

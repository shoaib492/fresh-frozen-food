import { createFileRoute, redirect } from '@tanstack/react-router'

// /admin is a shorthand entry point; the real screens live under /admin/*.
export const Route = createFileRoute('/admin/')({
  beforeLoad: () => { throw redirect({ to: '/admin/debug' }) },
})

import { Navigate } from 'react-router-dom'
import { useDevAccess, useAdminAccess } from '@/hooks/dev/useDevAccess'

/**
 * Hard access gate for any developer-only UI.
 *
 * Behavior:
 *  - While access state is loading → render null (no spinner, no layout
 *    flash visible to non-developer users).
 *  - Access denied → silent redirect to /app (default) or render null.
 *    Never renders "access denied" / "404" / "feature locked" — the
 *    existence of the feature cannot be inferred by non-developers.
 *  - Access granted → render children.
 *
 * Props:
 *  - children: ReactNode — protected UI
 *  - flag: string — feature flag name to require (default 'outlook_integration')
 *  - mode: 'redirect' (default) | 'null' — what to do when denied
 *  - to: string — redirect target when mode is 'redirect' (default '/app')
 */
export default function DeveloperOnly({
  children,
  flag = 'outlook_integration',
  mode = 'redirect',
  to = '/app',
}) {
  const { granted, ready } = useDevAccess(flag)

  if (!ready) return null
  if (!granted) {
    if (mode === 'null') return null
    return <Navigate to={to} replace />
  }
  return children
}

/**
 * Admin-or-above gate. Requires role in {developer, businessops, admin}
 * AND the given feature flag ON. Used by features that have been
 * promoted from "developer-only" to "internal team" via a public flag.
 */
export function AdminOnly({ children, flag, mode = 'redirect', to = '/app' }) {
  const { granted, ready } = useAdminAccess(flag)

  if (!ready) return null
  if (!granted) {
    if (mode === 'null') return null
    return <Navigate to={to} replace />
  }
  return children
}

import { Navigate } from 'react-router-dom'
import { useDevAccess } from '@/hooks/dev/useDevAccess'

/**
 * Hard access gate for any developer-only UI.
 *
 * Behavior:
 *  - While access state is loading → render null (no spinner, no layout flash
 *    visible to non-developer users).
 *  - Access denied → silent redirect to /app (default) or render null.
 *    Never renders an "access denied" / "404" / "feature locked" message,
 *    so the existence of the feature cannot be inferred by non-developers.
 *  - Access granted → render children.
 *
 * Props:
 *  - children: ReactNode — the protected UI
 *  - mode: 'redirect' (default) | 'null' — what to do when denied
 *  - to: string — redirect target when mode is 'redirect' (default '/app')
 */
export default function DeveloperOnly({ children, mode = 'redirect', to = '/app' }) {
  const { granted, ready } = useDevAccess()

  if (!ready) return null
  if (!granted) {
    if (mode === 'null') return null
    return <Navigate to={to} replace />
  }
  return children
}

import { Navigate } from 'react-router-dom'
import { useAdminAccess } from '@/hooks/dev/useDevAccess'

/**
 * Internal /email/* entry point — admin+ access gated on
 * email_marketing_public flag. When the flag is ON, redirects
 * the admin to /dev/email which holds the same UI (currently
 * pages are shared between /dev/email and /email).
 *
 * Long-term, a dedicated multi-tenant rebranded shell under
 * /email can render the same services without exposing /dev.
 * For now we keep one copy of the UI.
 */
export default function EmailPublicRouter() {
  const { granted, ready } = useAdminAccess('email_marketing_public')
  if (!ready) return null
  if (!granted) return <Navigate to="/app" replace />
  // Forward admins to the shared UI
  return <Navigate to="/dev/email" replace />
}

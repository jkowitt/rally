import { Navigate } from 'react-router-dom'

/**
 * Legacy /email/* entry point. The feature has moved inside the
 * authenticated app shell at /app/marketing/email where the same
 * UI is shared by developers and admins+ alike. This component
 * exists only as a backward-compat redirect.
 */
export default function EmailPublicRouter() {
  return <Navigate to="/app/marketing/email" replace />
}

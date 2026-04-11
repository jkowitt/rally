import { useAuth } from '@/hooks/useAuth'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'

/**
 * Central developer-only access check. Returns `granted: true` ONLY when
 * the user is the developer role AND the given feature flag is on.
 * All /dev routes, components, and services should consult this.
 *
 * Never surfaces "access denied" — if granted is false, callers silently
 * render null or redirect to /app without any indication that the feature
 * exists.
 *
 * @param {string} flag - feature flag module name (default 'outlook_integration'
 *                        for backwards compat with existing callers)
 */
export function useDevAccess(flag = 'outlook_integration') {
  const { profile, loading: authLoading } = useAuth()
  const { flags, loaded: flagsLoaded } = useFeatureFlags()

  const ready = !authLoading && flagsLoaded
  const isDeveloper = profile?.role === 'developer'
  const flagOn = Boolean(flags?.[flag])
  const granted = ready && isDeveloper && flagOn

  return { granted, ready, isDeveloper, flagOn }
}

/**
 * Admin+ access check — developer, businessops, or admin roles AND
 * the given flag is on. Used by features that are "public" (internal
 * users beyond just the developer) gated on a flag.
 */
export function useAdminAccess(flag) {
  const { profile, loading: authLoading } = useAuth()
  const { flags, loaded: flagsLoaded } = useFeatureFlags()

  const ready = !authLoading && flagsLoaded
  const role = profile?.role
  const hasRole = role === 'developer' || role === 'businessops' || role === 'admin'
  const flagOn = Boolean(flags?.[flag])
  const granted = ready && hasRole && flagOn

  return { granted, ready, hasRole, flagOn }
}

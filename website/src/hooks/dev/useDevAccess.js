import { useAuth } from '@/hooks/useAuth'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'

/**
 * Central developer-only access check. Returns `granted: true` ONLY when
 * the user is the developer role AND the outlook_integration feature flag
 * is on. All /dev routes, components, and services must consult this.
 *
 * Never surfaces "access denied" — if granted is false, callers silently
 * render null or redirect to /app without any indication that the feature
 * exists.
 */
export function useDevAccess() {
  const { profile, loading: authLoading } = useAuth()
  const { flags, loaded: flagsLoaded } = useFeatureFlags()

  const ready = !authLoading && flagsLoaded
  const isDeveloper = profile?.role === 'developer'
  const flagOn = Boolean(flags?.outlook_integration)
  const granted = ready && isDeveloper && flagOn

  return { granted, ready, isDeveloper, flagOn }
}

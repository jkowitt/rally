import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

// Disabled by default while we investigate a site-wide flicker /
// render-loop. Re-enable via VITE_ENABLE_USAGE_HEARTBEAT=true once
// the underlying issue is confirmed fixed; until then the dev-tools
// usage dashboard will show no heartbeats. The contract-quota +
// daily-limit features in migration 089 still work.
const DISABLED =
  typeof import.meta === 'undefined'
  // @ts-ignore — Vite injects env at build time
  || import.meta.env?.VITE_ENABLE_USAGE_HEARTBEAT !== 'true'

// Fire one heartbeat per minute while the tab is visible. The edge
// function inserts a row into usage_events; aggregate views in
// migration 089 turn those rows into "minutes used" by user and by
// property. Visibility-aware so a tab left open in the background
// doesn't inflate numbers.
export function useUsageHeartbeat() {
  const { profile, session } = useAuth()
  const intervalRef = useRef<number | null>(null)
  const lastFiredAt = useRef(0)

  useEffect(() => {
    if (DISABLED) return
    if (!session || !profile?.id) return

    async function fire() {
      // Don't fire when the tab is hidden — we want active time, not
      // wall-clock-while-app-is-open time.
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      // Throttle to once every 50s minimum so a Page Visibility API
      // wake-up doesn't double-fire.
      if (Date.now() - lastFiredAt.current < 50_000) return
      lastFiredAt.current = Date.now()
      try {
        await supabase.functions.invoke('usage-heartbeat', {
          body: { path: typeof window !== 'undefined' ? window.location.pathname : null },
        })
      } catch { /* fire-and-forget */ }
    }

    // Fire immediately, then every 60s.
    fire()
    intervalRef.current = window.setInterval(fire, 60_000)

    // Re-fire when the tab becomes visible after being backgrounded.
    const onVisible = () => { if (document.visibilityState === 'visible') fire() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      if (intervalRef.current != null) window.clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
    // Intentionally NOT including session?.access_token in deps —
    // it changes on every token refresh, which would tear down the
    // interval continuously and could feed a render loop. The
    // !!session guard above is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])
  // Reference session to satisfy any future linter that wants it.
  void session
}

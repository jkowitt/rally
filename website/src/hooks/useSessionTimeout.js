import { useEffect, useRef } from 'react'
import { useAuth } from './useAuth'

const TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export function useSessionTimeout() {
  const { session, signOut } = useAuth()
  const timerRef = useRef(null)

  useEffect(() => {
    if (!session) return

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        signOut()
        window.location.href = '/login?timeout=1'
      }, TIMEOUT_MS)
    }

    // Reset on user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [session, signOut])
}

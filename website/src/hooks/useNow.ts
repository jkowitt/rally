import { useSyncExternalStore } from 'react'

// Shared wall-clock store. Components that need to react to the
// passage of time (banners, stale-data badges, "X minutes ago"
// labels) subscribe to this instead of calling Date.now() directly
// in render — which would violate React's purity rules and cause
// hard-to-debug stale renders.
//
// The interval starts on first subscribe and stops automatically
// when the last subscriber unmounts, so we don't leak a global
// timer.

const listeners = new Set<() => void>()
let interval: ReturnType<typeof setInterval> | null = null

function tick() {
  for (const l of listeners) l()
}

function ensureInterval(periodMs: number) {
  if (interval) return
  interval = setInterval(tick, periodMs)
}

function maybeStopInterval() {
  if (listeners.size === 0 && interval) {
    clearInterval(interval)
    interval = null
  }
}

function makeSubscribe(periodMs: number) {
  return (cb: () => void) => {
    listeners.add(cb)
    ensureInterval(periodMs)
    return () => {
      listeners.delete(cb)
      maybeStopInterval()
    }
  }
}

const subscribeMinute = makeSubscribe(60_000)

function snapshotMinute(): number {
  return Math.floor(Date.now() / 60_000) * 60_000
}

// Returns the current time, rounded to the nearest minute, refreshing
// every 60s. Stable enough that components don't re-render constantly
// but live enough that "5 minutes ago" labels stay current.
export function useNowMinute(): number {
  return useSyncExternalStore(subscribeMinute, snapshotMinute, snapshotMinute)
}

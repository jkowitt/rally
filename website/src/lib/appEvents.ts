// Typed app event bus. Replaces ad-hoc `window.dispatchEvent(new
// CustomEvent('open-foo'))` strings with a typed map so misspellings
// fail at compile time and the wiring is greppable.
//
// Usage (publisher):
//   import { emit } from '@/lib/appEvents'
//   emit('open-new-deal')
//
// Usage (subscriber):
//   import { on } from '@/lib/appEvents'
//   useEffect(() => on('open-new-deal', () => setShowForm(true)), [])
//
// `on` returns the unsubscriber so you can use it directly inside
// useEffect cleanup.

// Map of event name → payload type. Adding a new event means adding
// it here, which surfaces in autocomplete everywhere `emit`/`on`
// are used.
export interface AppEventMap {
  'open-new-deal': void
  'open-find-prospects': void
  'open-upload-contract': void
  'open-suggestion': void
}

export type AppEventName = keyof AppEventMap

export function emit<K extends AppEventName>(name: K, ...args: AppEventMap[K] extends void ? [] : [AppEventMap[K]]) {
  const detail = (args[0] ?? undefined) as AppEventMap[K]
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

export function on<K extends AppEventName>(name: K, handler: (payload: AppEventMap[K]) => void): () => void {
  const wrapped = (e: Event) => {
    const detail = (e as CustomEvent<AppEventMap[K]>).detail
    handler(detail)
  }
  window.addEventListener(name, wrapped)
  return () => window.removeEventListener(name, wrapped)
}

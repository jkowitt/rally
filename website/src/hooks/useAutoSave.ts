import { useEffect, useRef, useState, useCallback } from 'react'

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

export interface AutoSaveOptions<T> {
  debounceMs?: number
  enabled?: boolean
  onSaved?: (value: T, savedAt: Date) => void
  onError?: (err: Error) => void
}

export interface AutoSaveAPI {
  status: SaveStatus
  save: () => Promise<void>
  discard: () => void
  lastSavedAt: Date | null
  error: Error | null
}

// Usage:
//   const { status, save, discard, lastSavedAt, error } = useAutoSave(value, async (v) => {
//     await supabase.from('...').upsert(v)
//   }, { debounceMs: 2000, enabled: true })
//
// - When `value` changes, status flips to 'dirty', and a debounced
//   autosave is scheduled. When it fires, status goes 'saving' →
//   'saved' (or 'error').
// - `save()` lets the caller force an immediate save (manual button).
// - `discard()` resets the dirty flag without saving (caller is
//   responsible for actually reverting the value).
//
// Equality is compared via JSON.stringify, which is fine for plain
// data shapes used in our forms. Don't pass functions / cycles.

export function useAutoSave<T>(
  value: T,
  saveFn: (value: T) => Promise<unknown>,
  options: AutoSaveOptions<T> = {}
): AutoSaveAPI {
  const {
    debounceMs = 2000,
    enabled = true,
    onSaved,
    onError,
  } = options

  const [status, setStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  const lastSavedRef = useRef<string>(JSON.stringify(value))
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef<boolean>(false)
  const pendingValueRef = useRef<T>(value)
  pendingValueRef.current = value

  const flush = useCallback(async () => {
    if (savingRef.current) return
    const snapshot = JSON.stringify(pendingValueRef.current)
    if (snapshot === lastSavedRef.current) {
      setStatus('saved')
      return
    }
    savingRef.current = true
    setStatus('saving')
    setError(null)
    try {
      await saveFn(pendingValueRef.current)
      lastSavedRef.current = snapshot
      const now = new Date()
      setLastSavedAt(now)
      setStatus('saved')
      if (onSaved) onSaved(pendingValueRef.current, now)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      setStatus('error')
      if (onError) onError(e)
    } finally {
      savingRef.current = false
    }
  }, [saveFn, onSaved, onError])

  useEffect(() => {
    if (!enabled) return
    const snapshot = JSON.stringify(value)
    if (snapshot === lastSavedRef.current) {
      // No-op edits keep us in 'saved' / 'idle' state
      return
    }
    setStatus('dirty')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      flush()
    }, debounceMs)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value, debounceMs, enabled, flush])

  const save = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    await flush()
  }, [flush])

  const discard = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    lastSavedRef.current = JSON.stringify(value)
    setStatus('idle')
    setError(null)
  }, [value])

  // Warn before unload if dirty
  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (status === 'dirty' || status === 'saving') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [status])

  return { status, save, discard, lastSavedAt, error }
}

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'

// useAddons — single source of truth for which add-ons are
// enabled for the current property. Backed by property_addons
// (migration 081). Used everywhere a feature is gated:
//
//   const addons = useAddons()
//   if (!addons.has('phone_calls')) return <UpgradePrompt addonKey="phone_calls" />
//
// The provider also exposes `request(addonKey, message)` to fire a
// Contact-Sales submission to the addon_requests table — the
// migration's notify_devs trigger fans that out to user_notifications
// for every developer.

interface AddonsAPI {
  has: (key: string) => boolean
  list: () => string[]
  loading: boolean
  request: (key: string, message?: string) => Promise<{ ok: boolean; error?: string }>
  refetch: () => void
}

const noop: AddonsAPI = {
  has: () => false,
  list: () => [],
  loading: false,
  request: async () => ({ ok: false, error: 'no provider' }),
  refetch: () => {},
}

const AddonsContext = createContext<AddonsAPI | null>(null)

export function AddonsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const propertyId = profile?.property_id
  const [keys, setKeys] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<boolean>(true)

  const refetch = useCallback(async () => {
    if (!propertyId) {
      setKeys(new Set())
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('property_active_addons')
      .select('addon_key')
      .eq('property_id', propertyId)
    setKeys(new Set((data || []).map(r => r.addon_key)))
    setLoading(false)
  }, [propertyId])

  useEffect(() => { refetch() }, [refetch])

  // Live-update when property_addons changes (admin flips a flag
  // → user immediately sees the new feature without a refresh).
  useEffect(() => {
    if (!propertyId) return
    const channel = supabase
      .channel(`property_addons_${propertyId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'property_addons',
        filter: `property_id=eq.${propertyId}`,
      }, () => refetch())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [propertyId, refetch])

  const has = useCallback((key: string) => keys.has(key), [keys])
  const list = useCallback(() => Array.from(keys), [keys])

  const request = useCallback(async (key: string, message?: string) => {
    if (!propertyId || !profile) return { ok: false, error: 'not authenticated' }
    const { error } = await supabase.from('addon_requests').insert({
      property_id: propertyId,
      addon_key: key,
      requested_by: profile.id,
      contact_email: profile.email,
      contact_name: profile.full_name,
      message: message || null,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }, [profile, propertyId])

  return (
    <AddonsContext.Provider value={{ has, list, loading, request, refetch }}>
      {children}
    </AddonsContext.Provider>
  )
}

export function useAddons(): AddonsAPI {
  const ctx = useContext(AddonsContext)
  return ctx || noop
}

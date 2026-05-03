import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { logLogin, logAudit } from '@/lib/audit'
import { maybeRunScheduledHealthCheck } from '@/lib/healthCheck'
import { maybeRunScheduledQA } from '@/lib/autoQA'
import { useImpersonation } from './useImpersonation'
import type { Profile } from '@/types/db'

const DEV_EMAIL = 'jlkowitt25@gmail.com'

export interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  realProfile: Profile | null
  realIsDeveloper: boolean
  isImpersonating: boolean
  isDeveloper: boolean
  isAdmin: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  fetchProfile: (userId: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, properties!profiles_property_id_fkey(*)')
        .eq('id', userId)
        .maybeSingle()

      if (error) console.warn('Profile fetch error:', error.message)

      if (!data) {
        // Profile doesn't exist yet — create one
        const { data: { user } } = await supabase.auth.getUser()
        const email = user?.email || ''
        const role: 'developer' | 'admin' =
          email.toLowerCase() === DEV_EMAIL ? 'developer' : 'admin'

        // Try to find or create a default property
        let propertyId: string | null = null
        const { data: existingProps } = await supabase.from('properties').select('id').limit(1)
        if (existingProps && existingProps.length > 0) {
          propertyId = existingProps[0].id as string
        }

        const profileData: Record<string, unknown> = {
          id: userId,
          full_name: user?.user_metadata?.full_name || '',
          email,
          role,
          onboarding_completed: false,
        }
        if (propertyId) profileData.property_id = propertyId

        const { data: newProfile } = await supabase
          .from('profiles')
          .upsert(profileData)
          .select('*, properties!profiles_property_id_fkey(*)')
          .maybeSingle()
        setProfile(newProfile as Profile | null)
      } else {
        // Ensure developer email always has developer role
        const { data: { user } } = await supabase.auth.getUser()
        const authEmail = user?.email?.toLowerCase() || ''
        const profileEmail = (data.email || '').toLowerCase()
        const typed = data as Profile
        if ((profileEmail === DEV_EMAIL || authEmail === DEV_EMAIL) && typed.role !== 'developer') {
          await supabase.from('profiles').update({ role: 'developer', email: DEV_EMAIL }).eq('id', userId)
          typed.role = 'developer'
          typed.email = DEV_EMAIL
        }
        setProfile(typed)
        if (typed.role === 'developer') {
          maybeRunScheduledHealthCheck()
          maybeRunScheduledQA()
        }
      }
    } catch (err) {
      console.error('fetchProfile failed:', err)
    }
    setLoading(false)
  }

  async function signIn(email: string, password: string): Promise<void> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      logLogin(null, email, false)
      throw error
    }
    if (data?.user) {
      await fetchProfile(data.user.id)
      logLogin(data.user.id, email, true)
      logAudit({
        action: 'login',
        entityType: 'session',
        entityId: undefined,
        entityName: undefined,
        changes: undefined,
        metadata: { user_agent: navigator.userAgent },
      })
    }
  }

  async function signUp(email: string, password: string, fullName: string): Promise<void> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  const realIsDeveloper = profile?.role === 'developer'
  const impersonation = useImpersonation()

  // Effective profile overlays impersonation values (visual only).
  // Real DB writes still go through the developer's session.
  let effectiveProfile: Profile | null = profile
  if (realIsDeveloper && profile && (impersonation.role || impersonation.industry)) {
    effectiveProfile = {
      ...profile,
      role: impersonation.role || profile.role,
      properties: impersonation.industry
        ? { ...(profile.properties || { id: '', name: null, type: null, sport: null, plan: null }), type: impersonation.industry }
        : profile.properties,
    }
  }

  const exposedProfile = effectiveProfile
  const isDeveloper = exposedProfile?.role === 'developer'
  const isAdmin = exposedProfile?.role === 'admin'

  const value: AuthContextValue = {
    session,
    profile: exposedProfile,
    realProfile: profile,
    realIsDeveloper,
    isImpersonating: realIsDeveloper && impersonation.isActive,
    loading,
    signIn,
    signUp,
    signOut,
    isDeveloper,
    isAdmin,
    fetchProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

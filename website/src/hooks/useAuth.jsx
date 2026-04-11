import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logLogin, logAudit } from '@/lib/audit'
import { maybeRunScheduledHealthCheck } from '@/lib/healthCheck'
import { maybeRunScheduledQA } from '@/lib/autoQA'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

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

  async function fetchProfile(userId) {
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
        const role = email.toLowerCase() === 'jlkowitt25@gmail.com' ? 'developer' : 'admin'

        // Try to find or create a default property
        let propertyId = null
        const { data: existingProps } = await supabase.from('properties').select('id').limit(1)
        if (existingProps?.length > 0) {
          propertyId = existingProps[0].id
        }

        const profileData = {
          id: userId,
          full_name: user?.user_metadata?.full_name || '',
          email,
          role,
          onboarding_completed: false,
        }
        if (propertyId) profileData.property_id = propertyId

        const { data: newProfile } = await supabase.from('profiles').upsert(profileData).select('*, properties!profiles_property_id_fkey(*)').maybeSingle()
        setProfile(newProfile)
      } else {
        // Ensure developer email always has developer role
        const { data: { user } } = await supabase.auth.getUser()
        const authEmail = user?.email?.toLowerCase() || ''
        const profileEmail = (data.email || '').toLowerCase()
        if ((profileEmail === 'jlkowitt25@gmail.com' || authEmail === 'jlkowitt25@gmail.com') && data.role !== 'developer') {
          await supabase.from('profiles').update({ role: 'developer', email: 'jlkowitt25@gmail.com' }).eq('id', userId)
          data.role = 'developer'
          data.email = 'jlkowitt25@gmail.com'
        }
        setProfile(data)
        // Run scheduled health check for developer
        if (data.role === 'developer') { maybeRunScheduledHealthCheck(); maybeRunScheduledQA() }
      }
    } catch (err) {
      console.error('fetchProfile failed:', err)
    }
    setLoading(false)
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      logLogin(null, email, false)
      throw error
    }
    if (data?.user) {
      await fetchProfile(data.user.id)
      logLogin(data.user.id, email, true)
      logAudit({ action: 'login', entityType: 'session', metadata: { user_agent: navigator.userAgent } })
    }
  }

  async function signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  const isDeveloper = profile?.role === 'developer'
  const isAdmin = profile?.role === 'admin'

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signUp, signOut, isDeveloper, isAdmin, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

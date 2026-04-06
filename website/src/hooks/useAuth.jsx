import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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
    const { data } = await supabase
      .from('profiles')
      .select('*, properties(name, sport, conference, type, plan, logo_url, trial_ends_at)')
      .eq('id', userId)
      .single()

    if (!data) {
      // Profile doesn't exist yet — first login after email confirmation
      // Create a minimal profile so the user can access the onboarding flow
      const { data: { user } } = await supabase.auth.getUser()
      const email = user?.email || ''
      const role = email.toLowerCase() === 'jlkowitt25@gmail.com' ? 'developer' : 'admin'
      const { data: newProfile } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: user?.user_metadata?.full_name || '',
        email,
        role,
        onboarding_completed: false,
      }).select('*, properties(name, sport, conference, type, plan, logo_url, trial_ends_at)').single()
      setProfile(newProfile)
    } else {
      // Ensure developer email always has developer role
      if (data.email?.toLowerCase() === 'jlkowitt25@gmail.com' && data.role !== 'developer') {
        await supabase.from('profiles').update({ role: 'developer' }).eq('id', userId)
        data.role = 'developer'
      }
      setProfile(data)
    }
    setLoading(false)
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
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

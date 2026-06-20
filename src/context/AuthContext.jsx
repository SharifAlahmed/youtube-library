import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, plan, plan_expires_at, preferred_domains')
      .eq('id', userId)
      .single()
    if (!error && data) setProfile(data)
  }, [])

  useEffect(() => {
    // resolved ensures loading=false is set by whichever resolves first
    // (getSession or onAuthStateChange INITIAL_SESSION), preventing a stuck spinner
    let resolved = false
    const markResolved = () => {
      if (!resolved) { resolved = true; setLoading(false) }
    }

    // 1) Authoritative initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) fetchProfile(session.user.id)
      markResolved()
    })

    // 2) Subsequent changes (login, logout, token refresh)
    //    In Supabase v2, INITIAL_SESSION fires immediately — markResolved covers
    //    the rare case where this fires before getSession resolves
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
      markResolved()
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  const refetchProfile = () => fetchProfile(session?.user?.id)

  return (
    <AuthContext.Provider value={{ session, profile, loading, refetchProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

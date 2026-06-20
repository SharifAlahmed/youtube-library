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
    // Step 1: authoritative initial check — sets loading=false exactly once
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AUTH] getSession result:', !!session)
      setSession(session)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
      setLoading(false)
    })

    // Step 2: listen for subsequent changes (login, logout, token refresh)
    // Does NOT touch loading — that is owned by getSession above
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AUTH] onAuthStateChange:', event, '| session:', !!session)
      setSession(session)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refetchProfile = () => fetchProfile(session?.user?.id)

  return (
    <AuthContext.Provider value={{ session, profile, loading, refetchProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

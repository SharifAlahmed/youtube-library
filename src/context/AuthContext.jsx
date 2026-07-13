import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isRecovering, setIsRecovering] = useState(false)

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, plan, plan_expires_at, preferred_domains, show_tags')
      .eq('id', userId)
      .single()
    if (!error && data) setProfile(data)
  }, [])

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION immediately on subscribe —
    // no need for a separate getSession() call.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AUTH] onAuthStateChange:', event, '| session:', !!session)
      setSession(session)

      if (event === 'INITIAL_SESSION') {
        if (session?.user) fetchProfile(session.user.id)
        else setProfile(null)
        setLoading(false)
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (session?.user) fetchProfile(session.user.id)
        else setProfile(null)
      } else if (event === 'SIGNED_OUT') {
        setProfile(null)
        setLoading(false)
        setIsRecovering(false)
      } else if (event === 'PASSWORD_RECOVERY') {
        setIsRecovering(true)
      }
      // TOKEN_REFRESHED: setSession above is enough — no fetchProfile, no loading change
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refetchProfile = () => fetchProfile(session?.user?.id)

  // Optimistic update of profiles.show_tags — reverts on error.
  const updateShowTags = async (value) => {
    const userId = session?.user?.id
    if (!userId) return { error: new Error('Not signed in') }
    const prevProfile = profile
    setProfile(p => (p ? { ...p, show_tags: value } : p))
    const { error } = await supabase
      .from('profiles')
      .update({ show_tags: value })
      .eq('id', userId)
    if (error) {
      setProfile(prevProfile) // revert
      return { error }
    }
    return { error: null }
  }

  const showTags = profile?.show_tags ?? false

  return (
    <AuthContext.Provider value={{ session, profile, loading, showTags, updateShowTags, refetchProfile, signOut, isRecovering, setIsRecovering }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'

export default function LoginPage() {
  const { session } = useAuth()
  const { t, toggleLang } = useLang()
  const { isDark, toggleTheme } = useTheme()

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [info, setInfo]         = useState('')

  // Already logged in → go home
  if (session) return <Navigate to="/" replace />

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfo('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setInfo(t.checkEmail)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
    setLoading(false)
  }

  const handleGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })

  return (
    <div className="min-h-screen flex items-center justify-center px-4
                    bg-gradient-to-br from-primary-50 via-white to-violet-50
                    dark:from-gray-950 dark:via-gray-900 dark:to-violet-950">

      {/* Top-corner controls */}
      <div className="fixed top-4 end-4 flex items-center gap-2 z-10">
        <button
          onClick={toggleLang}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200
                     dark:border-gray-600 bg-white dark:bg-gray-800
                     text-gray-700 dark:text-gray-300
                     hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {t.language}
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-600
                     bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400
                     hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {isDark ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707
                   M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707
                   M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            </svg>
          )}
        </button>
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center
                          mx-auto mb-4 shadow-lg shadow-primary-200 dark:shadow-primary-950">
            <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501
                s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805
                31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502
                9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0
                .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.appName}</h1>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8
                        border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
            {isSignUp ? t.signUp : t.welcomeBack}
          </h2>

          {/* Email form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600
                           bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                           placeholder-gray-400 focus:outline-none focus:ring-2
                           focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t.passwordPlaceholder}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600
                           bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                           placeholder-gray-400 focus:outline-none focus:ring-2
                           focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20
                            px-3 py-2 rounded-lg">
                {error}
              </p>
            )}
            {info && (
              <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20
                            px-3 py-2 rounded-lg">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400
                         text-white rounded-xl font-medium transition-colors"
            >
              {loading ? t.loading : (isSignUp ? t.signUp : t.login)}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
            <span className="text-sm text-gray-400">{t.or}</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            className="w-full py-3 flex items-center justify-center gap-3 border border-gray-200
                       dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl
                       font-medium text-gray-700 dark:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t.loginWithGoogle}
          </button>

          {/* Switch mode */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            {isSignUp ? t.alreadyHaveAccount : t.noAccount}{' '}
            <button
              onClick={() => { setIsSignUp(p => !p); setError(''); setInfo('') }}
              className="text-primary-600 hover:text-primary-700 font-semibold"
            >
              {isSignUp ? t.login : t.signUp}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

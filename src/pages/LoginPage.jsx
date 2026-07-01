import { useState } from 'react'
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import LuminaverseIcon from '../components/LuminaverseIcon'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function mapAuthError(message, t) {
  if (!message) return { text: t.errGeneric, type: null }
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials') || m.includes('invalid credentials') || m.includes('email not confirmed'))
    return { text: t.errInvalidCredentials, type: null }
  if (m.includes('user already registered') || m.includes('already registered') || m.includes('already exists'))
    return { text: t.errEmailAlreadyRegistered, type: 'alreadyRegistered' }
  if (m.includes('weak') || (m.includes('password') && (m.includes('short') || m.includes('6 char'))))
    return { text: t.errWeakPassword, type: null }
  if (m.includes('invalid email') || m.includes('valid email') || m.includes('email format'))
    return { text: t.errInvalidEmail, type: null }
  return { text: message, type: null }
}

function EyeIcon({ open }) {
  return open ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7
           a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242
           M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0
           A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7
           a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7
           -1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

export default function LoginPage() {
  const { session } = useAuth()
  const { t, toggleLang } = useLang()
  const { isDark, toggleTheme } = useTheme()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // mode: 'login' | 'signup' | 'forgot'
  const [mode, setMode]           = useState(() =>
    searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  )
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirmPw, setConfirmPw]     = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [errorType, setErrorType]     = useState(null)
  const [info, setInfo]               = useState('')
  const [showPw, setShowPw]           = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  if (session) return <Navigate to="/app" replace />

  const clearMessages = () => { setError(''); setErrorType(null); setInfo('') }

  const switchMode = (next) => { setMode(next); clearMessages(); setPassword(''); setConfirmPw('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearMessages()

    if (!EMAIL_RE.test(email)) {
      setError(t.errInvalidEmail)
      return
    }

    if (mode === 'forgot') {
      setLoading(true)
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      setLoading(false)
      if (err) {
        const mapped = mapAuthError(err.message, t)
        setError(mapped.text)
        setErrorType(mapped.type)
      } else {
        setInfo(t.resetLinkSent)
      }
      return
    }

    if (mode === 'signup' && password.length < 6) {
      setError(t.errWeakPassword)
      return
    }

    if (mode === 'signup' && password !== confirmPw) {
      setError(t.passwordsMismatch)
      return
    }

    setLoading(true)
    if (mode === 'signup') {
      const { error: err } = await supabase.auth.signUp({ email, password })
      if (err) {
        const mapped = mapAuthError(err.message, t)
        setError(mapped.text)
        setErrorType(mapped.type)
      } else {
        setInfo(t.checkEmail)
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) {
        const mapped = mapAuthError(err.message, t)
        setError(mapped.text)
        setErrorType(mapped.type)
        setLoading(false)
      } else {
        console.log('[AUTH] signInWithPassword success — navigating to /app')
        navigate('/app', { replace: true })
        return
      }
    }
    setLoading(false)
  }

  const handleGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })

  const titles = {
    login:  t.welcomeBack,
    signup: t.signUp,
    forgot: t.forgotPasswordTitle,
  }

  const btnLabel = mode === 'login' ? t.login
    : mode === 'signup' ? t.signUp
    : t.sendResetLink

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
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <LuminaverseIcon className="w-16 h-16" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t.appName}</h1>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8
                        border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 text-center">
            {titles[mode]}
          </h2>

          {mode === 'forgot' && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-5 mt-1">
              {t.forgotPasswordDesc}
            </p>
          )}

          <form onSubmit={handleSubmit} className={`space-y-4 ${mode !== 'forgot' ? 'mt-4' : ''}`}>

            {/* Email */}
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

            {/* Password + Confirm — hidden in forgot mode */}
            {mode !== 'forgot' && (
              <>
                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t.password}
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400
                                   hover:underline transition-colors"
                      >
                        {t.forgotPasswordLink}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={t.passwordPlaceholder}
                      required
                      className="w-full px-4 py-3 pe-12 rounded-xl border border-gray-200 dark:border-gray-600
                                 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                                 placeholder-gray-400 focus:outline-none focus:ring-2
                                 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPw(p => !p)}
                      aria-label={showPw ? t.hidePassword : t.showPassword}
                      className="absolute inset-y-0 end-0 flex items-center px-3
                                 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <EyeIcon open={showPw} />
                    </button>
                  </div>
                  {mode === 'signup' && password.length > 0 && password.length < 6 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 ps-1">
                      {t.passwordMinHint}
                    </p>
                  )}
                </div>

                {/* Confirm password (signup only) */}
                {mode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t.confirmNewPassword}
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPw ? 'text' : 'password'}
                        value={confirmPw}
                        onChange={e => setConfirmPw(e.target.value)}
                        placeholder={t.confirmNewPasswordPlaceholder}
                        required
                        className="w-full px-4 py-3 pe-12 rounded-xl border border-gray-200 dark:border-gray-600
                                   bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                                   placeholder-gray-400 focus:outline-none focus:ring-2
                                   focus:ring-primary-500 focus:border-transparent transition-all"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowConfirmPw(p => !p)}
                        aria-label={showConfirmPw ? t.hidePassword : t.showPassword}
                        className="absolute inset-y-0 end-0 flex items-center px-3
                                   text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <EyeIcon open={showConfirmPw} />
                      </button>
                    </div>
                    {confirmPw.length > 0 && confirmPw !== password && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 ps-1">
                        {t.passwordsMismatch}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Error message */}
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20
                              px-3 py-2.5 rounded-lg leading-relaxed">
                <p>{error}</p>
                {errorType === 'alreadyRegistered' && (
                  <p className="mt-1.5 flex flex-wrap gap-1 items-center text-xs">
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="font-semibold underline underline-offset-2"
                    >
                      {t.alreadyRegisteredLoginLink}
                    </button>
                    <span className="opacity-70">{t.alreadyRegisteredForgotSep}</span>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="font-semibold underline underline-offset-2"
                    >
                      {t.forgotPasswordLink}
                    </button>
                  </p>
                )}
              </div>
            )}

            {/* Success / info message */}
            {info && (
              <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20
                            px-3 py-2.5 rounded-lg leading-relaxed">
                {info}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400
                         text-white rounded-xl font-medium transition-colors
                         flex items-center justify-center gap-2"
            >
              {loading && <Spinner />}
              {loading ? t.loading : btnLabel}
            </button>
          </form>

          {/* Back to login (forgot mode) */}
          {mode === 'forgot' && (
            <p className="text-center text-sm mt-4">
              <button
                onClick={() => switchMode('login')}
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-semibold"
              >
                {t.backToLogin}
              </button>
            </p>
          )}

          {/* Divider + Google + mode toggle (login/signup only) */}
          {mode !== 'forgot' && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
                <span className="text-sm text-gray-400">{t.or}</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600" />
              </div>

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

              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                {mode === 'signup' ? t.alreadyHaveAccount : t.noAccount}{' '}
                <button
                  onClick={() => switchMode(mode === 'signup' ? 'login' : 'signup')}
                  className="text-primary-600 hover:text-primary-700 font-semibold"
                >
                  {mode === 'signup' ? t.login : t.signUp}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

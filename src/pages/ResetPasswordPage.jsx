import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import LuminaverseIcon from '../components/LuminaverseIcon'

const LINK_WAIT_MS = 4000

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

export default function ResetPasswordPage() {
  const { isRecovering, setIsRecovering, signOut } = useAuth()
  const { t, toggleLang } = useLang()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [linkInvalid, setLinkInvalid]         = useState(false)
  const [password, setPassword]               = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw]                   = useState(false)
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState('')

  // If no PASSWORD_RECOVERY event arrives in time, the link is expired/invalid.
  useEffect(() => {
    if (isRecovering) { setLinkInvalid(false); return }
    const timer = setTimeout(() => setLinkInvalid(true), LINK_WAIT_MS)
    return () => clearTimeout(timer)
  }, [isRecovering])

  const handleUpdate = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError(t.passwordMinHint); return }
    if (password !== confirmPassword) { setError(t.passwordsMismatch); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setLoading(false)
      setError(err.message)
      return
    }
    await signOut()
    setIsRecovering(false)
    navigate('/login', { replace: true, state: { passwordUpdated: true } })
  }

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

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8
                        border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
            {t.resetPasswordTitle}
          </h2>

          {/* Waiting for recovery token */}
          {!isRecovering && !linkInvalid && (
            <div className="text-center py-6">
              <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent
                              rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t.loading}</p>
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
              >
                {t.backToLogin}
              </button>
            </div>
          )}

          {/* Expired / invalid recovery link */}
          {!isRecovering && linkInvalid && (
            <div className="text-center py-6">
              <p className="text-sm text-red-600 dark:text-red-400 mb-5">
                {t.resetLinkInvalid}
              </p>
              <button
                onClick={() => navigate('/login?mode=forgot')}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white
                           rounded-xl font-medium transition-colors"
              >
                {t.requestNewLink}
              </button>
              <p className="text-center text-sm mt-4">
                <button
                  onClick={() => navigate('/login')}
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
                >
                  {t.backToLogin}
                </button>
              </p>
            </div>
          )}

          {/* Reset form */}
          {isRecovering && (
            <form onSubmit={handleUpdate} className="space-y-4">
              {/* New password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t.newPassword}
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={t.newPasswordPlaceholder}
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
                {password.length > 0 && password.length < 6 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 ps-1">
                    {t.passwordMinHint}
                  </p>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t.confirmNewPassword}
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={t.confirmNewPasswordPlaceholder}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600
                             bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                             placeholder-gray-400 focus:outline-none focus:ring-2
                             focus:ring-primary-500 focus:border-transparent transition-all"
                />
                {confirmPassword.length > 0 && confirmPassword !== password && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 ps-1">
                    {t.passwordsMismatch}
                  </p>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20
                              px-3 py-2.5 rounded-lg">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400
                           text-white rounded-xl font-medium transition-colors
                           flex items-center justify-center gap-2"
              >
                {loading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                            stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                )}
                {loading ? t.loading : t.updatePassword}
              </button>

              <p className="text-center text-sm mt-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  {t.backToLogin}
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

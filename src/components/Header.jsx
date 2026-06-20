import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { useLibrary } from '../context/LibraryContext'
import UpgradeModal from './UpgradeModal'

const PLAN_BADGE = {
  free:     'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  monthly:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  lifetime: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

export default function Header() {
  const { profile, signOut } = useAuth()
  const { t, toggleLang } = useLang()
  const { isDark, toggleTheme } = useTheme()
  const { openAddModal } = useLibrary()
  const [showUpgrade, setShowUpgrade] = useState(false)

  const plan = profile?.plan ?? 'free'
  const planLabel = t[plan] ?? t.free
  const badgeClass = PLAN_BADGE[plan] ?? PLAN_BADGE.free

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-700
                         bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">

            {/* ── Logo + Name + Nav ───────────────────────── */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501
                    s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805
                    31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502
                    9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0
                    .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white hidden sm:block">
                {t.appName}
              </span>
              <nav className="flex items-center gap-1 ms-1">
                <NavLink
                  to="/app"
                  end
                  className={({ isActive }) =>
                    `text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`
                  }
                >
                  {t.libraryNav}
                </NavLink>
                <NavLink
                  to="/app/prompts"
                  className={({ isActive }) =>
                    `text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`
                  }
                >
                  {t.myPrompts}
                </NavLink>
                <NavLink
                  to="/app/collections"
                  className={({ isActive }) =>
                    `text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`
                  }
                >
                  {t.collectionsNav}
                </NavLink>
              </nav>
            </div>

            {/* ── Controls ─────────────────────────────────── */}
            <div className="flex items-center gap-2">

              {/* Add Video — primary action */}
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 text-xs font-semibold
                           px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white
                           rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
                </svg>
                <span className="hidden sm:inline">{t.addVideo}</span>
              </button>

              {/* Plan badge */}
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>
                {planLabel}
              </span>

              {/* Upgrade button — only for free users */}
              {plan === 'free' && (
                <button
                  onClick={() => setShowUpgrade(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold
                             px-3 py-1.5 border border-primary-300 dark:border-primary-700
                             text-primary-600 dark:text-primary-400
                             hover:bg-primary-50 dark:hover:bg-primary-900/20
                             rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                  {t.upgrade}
                </button>
              )}

              {/* Dark / light toggle */}
              <button
                onClick={toggleTheme}
                title={isDark ? t.lightMode : t.darkMode}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400
                           hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {isDark ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707
                         M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707
                         M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                  </svg>
                )}
              </button>

              {/* Sign out */}
              <button
                onClick={signOut}
                title={t.logout}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400
                           hover:bg-red-50 dark:hover:bg-red-900/20
                           hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7
                       a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
              </button>

            </div>
          </div>
        </div>
      </header>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </>
  )
}

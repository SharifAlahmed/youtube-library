import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { useLibrary } from '../context/LibraryContext'
import UpgradeModal from './UpgradeModal'
import LuminaverseIcon from './LuminaverseIcon'

const PLAN_BADGE = {
  free:     'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  monthly:  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  lifetime: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

// Small pill switch: label + on/off track. RTL-safe (logical inset props).
function ShowTagsToggle({ label, checked, onChange, className = '' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      title={label}
      className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg
                  border border-gray-200 dark:border-gray-600
                  text-gray-700 dark:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
    >
      <span>🏷️ {label}</span>
      <span
        className={`relative inline-block rounded-full transition-colors shrink-0 ${
          checked ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
        style={{ width: 32, height: 18 }}
      >
        <span
          className="absolute rounded-full bg-white shadow transition-all"
          style={{ width: 14, height: 14, top: 2, insetInlineStart: checked ? 16 : 2 }}
        />
      </span>
    </button>
  )
}

export default function Header() {
  const { profile, signOut, showTags, updateShowTags } = useAuth()
  const { t, toggleLang } = useLang()
  const { isDark, toggleTheme } = useTheme()
  const { openAddModal } = useLibrary()
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const plan = profile?.plan ?? 'free'
  const planLabel = t[plan] ?? t.free
  const badgeClass = PLAN_BADGE[plan] ?? PLAN_BADGE.free

  const closeMenu = () => setMenuOpen(false)

  // Optimistic in AuthContext; reverts automatically on error.
  const handleToggleTags = () => updateShowTags(!showTags)

  const desktopNavCls = ({ isActive }) =>
    `text-sm font-medium px-3.5 py-1.5 rounded-full transition-all ${
      isActive
        ? 'bg-gray-900 dark:bg-primary-400 text-white dark:text-gray-900 shadow-sm'
        : 'text-[var(--muted)] hover:bg-[var(--accent-tint)] hover:text-[var(--accent)]'
    }`

  const mobileNavCls = ({ isActive }) =>
    `block w-full text-sm font-medium px-4 py-2.5 rounded-xl transition-all text-start ${
      isActive
        ? 'bg-gray-900 dark:bg-primary-400 text-white dark:text-gray-900'
        : 'text-[var(--ink)] hover:bg-[var(--accent-tint)] hover:text-[var(--accent)]'
    }`

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full border-b border-[var(--border)]
                   bg-[var(--card)]/90 backdrop-blur-md relative"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">

            {/* ── Logo + inline nav (lg+) ───────────────────── */}
            <div className="flex items-center gap-3 shrink-0">
              <LuminaverseIcon className="w-8 h-8" />
              <span className="text-lg font-bold text-gray-900 dark:text-white hidden sm:block">
                {t.appName}
              </span>

              {/* Nav links — only on lg+ */}
              <nav className="hidden lg:flex items-center gap-1 ms-1">
                <NavLink to="/app" end className={desktopNavCls}>{t.libraryNav}</NavLink>
                <NavLink to="/app/prompts" className={desktopNavCls}>{t.myPrompts}</NavLink>
                <NavLink to="/app/collections" className={desktopNavCls}>{t.collectionsNav}</NavLink>
                <NavLink to="/app/how" className={desktopNavCls}>{t.howItWorksNav}</NavLink>
              </nav>
            </div>

            {/* ── Controls ─────────────────────────────────── */}
            <div className="flex items-center gap-2">

              {/* Add Video — always visible */}
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

              {/* Plan badge — lg+ only */}
              <span className={`hidden lg:inline text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>
                {planLabel}
              </span>

              {/* Upgrade — lg+ only */}
              {plan === 'free' && (
                <button
                  onClick={() => setShowUpgrade(true)}
                  className="hidden lg:inline-flex items-center gap-1.5 text-xs font-semibold
                             px-3 py-1.5
                             bg-gray-900 hover:bg-gray-800 dark:bg-primary-100 dark:hover:bg-primary-200
                             text-white dark:text-gray-900
                             rounded-full transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                  {t.upgrade}
                </button>
              )}

              {/* Show tags toggle — lg+ only */}
              <ShowTagsToggle
                label={t.showTagsSetting}
                checked={showTags}
                onChange={handleToggleTags}
                className="hidden lg:inline-flex"
              />

              {/* Language toggle — lg+ only */}
              <button
                onClick={toggleLang}
                className="hidden lg:inline-flex text-xs font-medium px-3 py-1.5 rounded-lg
                           border border-gray-200 dark:border-gray-600
                           text-gray-700 dark:text-gray-300
                           hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {t.language}
              </button>

              {/* Dark / light toggle — lg+ only */}
              <button
                onClick={toggleTheme}
                title={isDark ? t.lightMode : t.darkMode}
                className="hidden lg:inline p-2 rounded-lg text-gray-500 dark:text-gray-400
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

              {/* Sign out — lg+ only */}
              <button
                onClick={signOut}
                title={t.logout}
                className="hidden lg:inline p-2 rounded-lg text-gray-500 dark:text-gray-400
                           hover:bg-red-50 dark:hover:bg-red-900/20
                           hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7
                       a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
              </button>

              {/* Hamburger — mobile/tablet only (< lg) */}
              <button
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Menu"
                className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400
                           hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {menuOpen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"/>
                  </svg>
                )}
              </button>

            </div>
          </div>
        </div>

        {/* ── Mobile / tablet dropdown ── */}
        {menuOpen && (
          <div
            className="lg:hidden absolute start-0 end-0 top-16 z-50
                       bg-[var(--card)] border-b border-[var(--border)]"
            style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
          >
            {/* Nav links */}
            <nav className="px-4 pt-3 pb-2 space-y-1">
              <NavLink to="/app" end className={mobileNavCls} onClick={closeMenu}>
                {t.libraryNav}
              </NavLink>
              <NavLink to="/app/prompts" className={mobileNavCls} onClick={closeMenu}>
                {t.myPrompts}
              </NavLink>
              <NavLink to="/app/collections" className={mobileNavCls} onClick={closeMenu}>
                {t.collectionsNav}
              </NavLink>
              <NavLink to="/app/how" className={mobileNavCls} onClick={closeMenu}>
                {t.howItWorksNav}
              </NavLink>
            </nav>

            {/* Bottom strip: badge + secondary controls */}
            <div className="px-4 py-3 border-t border-[var(--border)] flex items-center gap-2 flex-wrap">
              {/* Plan badge */}
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>
                {planLabel}
              </span>

              {/* Upgrade */}
              {plan === 'free' && (
                <button
                  onClick={() => { setShowUpgrade(true); closeMenu() }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold
                             px-3 py-1.5
                             bg-gray-900 hover:bg-gray-800 dark:bg-primary-100 dark:hover:bg-primary-200
                             text-white dark:text-gray-900
                             rounded-full transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                  {t.upgrade}
                </button>
              )}

              {/* Show tags toggle — mobile */}
              <ShowTagsToggle
                label={t.showTagsSetting}
                checked={showTags}
                onChange={handleToggleTags}
              />

              {/* Language + Dark + Logout */}
              <div className="ms-auto flex items-center gap-1">
                <button
                  onClick={toggleLang}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200
                             dark:border-gray-600 text-gray-700 dark:text-gray-300
                             hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {t.language}
                </button>

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
        )}
      </header>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </>
  )
}

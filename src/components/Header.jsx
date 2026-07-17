import { useState, useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { useLibrary } from '../context/LibraryContext'
import UpgradeModal from './UpgradeModal'
import LuminaverseIcon from './LuminaverseIcon'
import HelpTip from './HelpTip'

// Standalone pill switch — track + thumb only, label lives beside it
function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="relative shrink-0 rounded-full transition-colors
                 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1"
      style={{ width: 34, height: 18, background: checked ? '#1D9E75' : 'var(--border)' }}
    >
      <span
        className="absolute top-0.5 rounded-full bg-white shadow transition-all"
        style={{ width: 14, height: 14, insetInlineStart: checked ? 18 : 2 }}
      />
    </button>
  )
}

export default function Header() {
  const { profile, signOut, showTags, updateShowTags } = useAuth()
  const { t, toggleLang }  = useLang()
  const { isDark, toggleTheme } = useTheme()
  const { openAddModal }   = useLibrary()
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [menuOpen, setMenuOpen]       = useState(false)
  const menuRef = useRef(null)

  const plan      = profile?.plan ?? 'free'
  const planLabel = t[plan] ?? t.free
  const initial   = profile?.display_name?.[0]?.toUpperCase() ?? null

  const handleToggleTags = () => updateShowTags(!showTags)

  // Close menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false) }
    const onKey  = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // Active nav pill: rgba brand-green background + brand-green text
  const navCls   = ({ isActive }) =>
    `text-sm font-medium px-3.5 py-1.5 rounded-full transition-all ${
      isActive
        ? 'font-semibold'
        : 'text-[var(--muted)] hover:bg-[var(--accent-tint)] hover:text-[var(--accent)]'
    }`
  const navStyle = ({ isActive }) =>
    isActive ? { background: 'rgba(29,158,117,0.12)', color: '#1D9E75' } : undefined

  // Dropdown nav links (mobile only inside menu)
  const dropNavCls   = ({ isActive }) =>
    `block w-full text-sm font-medium px-3 py-2 rounded-lg transition-all text-start ${
      isActive ? 'font-semibold' : 'text-[var(--ink)] hover:bg-[var(--accent-tint)] hover:text-[var(--accent)]'
    }`
  const dropNavStyle = ({ isActive }) =>
    isActive ? { background: 'rgba(29,158,117,0.10)', color: '#1D9E75' } : undefined

  // Shared button-row style inside dropdown
  const rowCls =
    'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-[var(--ink)] ' +
    'hover:bg-[var(--accent-tint)] transition-colors text-start'

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full border-b border-[var(--border)]
                   bg-[var(--card)]/90 backdrop-blur-md"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">

            {/* ── Start: Logo + inline nav (desktop) ── */}
            <div className="flex items-center gap-3 min-w-0">
              <LuminaverseIcon className="w-8 h-8 shrink-0" />
              <span className="text-lg font-bold text-gray-900 dark:text-white hidden sm:block shrink-0">
                {t.appName}
              </span>

              {/* 3-item nav — desktop only */}
              <nav className="hidden lg:flex items-center gap-0.5 ms-1">
                <NavLink to="/app" end className={navCls} style={navStyle}>
                  {t.libraryNav}
                </NavLink>
                <NavLink to="/app/collections" className={navCls} style={navStyle}>
                  {t.collectionsNav}
                </NavLink>
                <NavLink to="/app/prompts" className={navCls} style={navStyle}>
                  {t.myPrompts}
                </NavLink>
              </nav>
            </div>

            {/* ── End: Add Video + Avatar ── */}
            <div className="flex items-center gap-2 shrink-0">

              {/* Primary CTA — always visible */}
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 text-sm font-semibold
                           px-4 py-2 bg-primary-600 hover:bg-primary-500 active:bg-primary-700 text-white
                           rounded-lg transition-colors shadow-sm"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
                </svg>
                <span className="hidden sm:inline">{t.addVideo}</span>
              </button>

              {/* Avatar button + dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  aria-label={t.accountMenuLabel}
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                  className="w-8 h-8 rounded-full flex items-center justify-center
                             text-white text-sm font-bold shrink-0
                             focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1
                             transition-opacity hover:opacity-90 active:opacity-80"
                  style={{ background: '#1D9E75' }}
                >
                  {initial ? (
                    <span>{initial}</span>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                  )}
                </button>

                {/* ── Account dropdown ── */}
                {menuOpen && (
                  <div
                    className="absolute end-0 top-full mt-2 w-64 rounded-2xl overflow-hidden z-50
                               bg-[var(--card)] border border-[var(--border)]"
                    style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.15)' }}
                    role="menu"
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-[var(--border)]">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink)' }}>
                        {profile?.display_name ?? '—'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>
                          {t.planLabel}: {planLabel}
                        </span>
                        {plan === 'free' && (
                          <button
                            onClick={() => { setShowUpgrade(true); setMenuOpen(false) }}
                            className="text-xs font-semibold hover:underline transition-colors"
                            style={{ color: '#1D9E75' }}
                          >
                            {t.upgrade} ⚡
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mobile nav (hidden on lg+) */}
                    <div className="lg:hidden px-2 py-2 space-y-0.5 border-b border-[var(--border)]">
                      <NavLink
                        to="/app" end
                        className={dropNavCls} style={dropNavStyle}
                        onClick={() => setMenuOpen(false)}
                      >
                        {t.libraryNav}
                      </NavLink>
                      <NavLink
                        to="/app/collections"
                        className={dropNavCls} style={dropNavStyle}
                        onClick={() => setMenuOpen(false)}
                      >
                        {t.collectionsNav}
                      </NavLink>
                      <NavLink
                        to="/app/prompts"
                        className={dropNavCls} style={dropNavStyle}
                        onClick={() => setMenuOpen(false)}
                      >
                        {t.myPrompts}
                      </NavLink>
                    </div>

                    {/* Settings items */}
                    <div className="py-1">

                      {/* Show tags toggle */}
                      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <div className="flex items-center gap-1.5 text-sm min-w-0" style={{ color: 'var(--ink)' }}>
                          <span className="shrink-0">🏷️</span>
                          <span className="truncate">{t.showTagsSetting}</span>
                          <HelpTip tip={t.helpTipTags} />
                        </div>
                        <ToggleSwitch checked={showTags} onChange={handleToggleTags} />
                      </div>

                      {/* Language */}
                      <button
                        onClick={() => { toggleLang(); setMenuOpen(false) }}
                        className={rowCls}
                        role="menuitem"
                      >
                        <span>{t.menuLanguage}</span>
                        <span className="text-xs shrink-0" style={{ color: 'var(--muted)' }}>
                          {t.currentLangName}
                        </span>
                      </button>

                      {/* Theme */}
                      <button
                        onClick={() => { toggleTheme(); setMenuOpen(false) }}
                        className={rowCls}
                        role="menuitem"
                      >
                        <span>{t.menuTheme}</span>
                        <span className="text-xs shrink-0" style={{ color: 'var(--muted)' }}>
                          {isDark ? t.themeDark : t.themeLight}
                        </span>
                      </button>

                      {/* How it Works */}
                      <NavLink
                        to="/app/how"
                        className={({ isActive }) =>
                          `block px-4 py-2.5 text-sm transition-colors ${
                            isActive
                              ? 'font-semibold'
                              : 'text-[var(--ink)] hover:bg-[var(--accent-tint)]'
                          }`
                        }
                        style={({ isActive }) => isActive ? { color: '#1D9E75' } : undefined}
                        onClick={() => setMenuOpen(false)}
                        role="menuitem"
                      >
                        {t.howItWorksNav}
                      </NavLink>
                    </div>

                    {/* Log out */}
                    <div className="border-t border-[var(--border)] py-1">
                      <button
                        onClick={() => { signOut(); setMenuOpen(false) }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm
                                   text-red-600 dark:text-red-400
                                   hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-start"
                        role="menuitem"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7
                               a3 3 0 013-3h4a3 3 0 013 3v1"/>
                        </svg>
                        {t.logout}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </header>

      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </>
  )
}

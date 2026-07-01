import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageContext'
import { useLibrary } from '../context/LibraryContext'
import { useAuth } from '../context/AuthContext'
import VideoCard from '../components/VideoCard'

// ── Helpers ──────────────────────────────────────────────────────────────────
function normTags(raw) {
  if (Array.isArray(raw)) return raw.filter(Boolean)
  if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

function toggleSet(setter, value) {
  setter(prev => {
    const next = new Set(prev)
    next.has(value) ? next.delete(value) : next.add(value)
    return next
  })
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, iconBg, accentValue = false }) {
  return (
    <div
      className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 sm:p-5"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[18px] leading-none ${iconBg}`}>
          {icon}
        </div>
        <div>
          <p className={`text-2xl font-bold leading-tight ${accentValue ? 'text-[var(--accent)]' : 'text-[var(--ink)]'}`}>
            {value}
          </p>
          <p className="text-[12px] text-[var(--muted)] mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  )
}

// ── Quick Filter Pill ────────────────────────────────────────────────────────
function FilterPill({ label, active, onClick, count }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium
        transition-all duration-150 whitespace-nowrap
        ${active
          ? 'bg-gray-900 dark:bg-primary-500 text-white shadow-sm'
          : 'bg-[var(--card)] text-[var(--muted)] border border-[var(--border)] hover:bg-[var(--accent-tint)] hover:text-[var(--accent)] hover:border-[var(--accent-soft)]'}
      `}
    >
      {label}
      {count != null && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
          active ? 'bg-white/20' : 'bg-[var(--accent-tint)] text-[var(--accent)]'
        }`}>
          {count}
        </span>
      )}
    </button>
  )
}

// ── Filter Group Accordion ───────────────────────────────────────────────────
function FilterGroup({ title, icon, items, selected, onToggle }) {
  const [open, setOpen] = useState(true)
  const activeCount = items.filter(([v]) => selected.has(v)).length

  if (items.length === 0) return null

  return (
    <div className="border-b border-[var(--border)] last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-2.5 px-1 text-start"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm leading-none shrink-0">{icon}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] truncate">
            {title}
          </span>
          {activeCount > 0 && (
            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full
                             bg-[var(--accent)] text-white font-bold">
              {activeCount}
            </span>
          )}
        </div>
        <svg
          className={`w-3.5 h-3.5 shrink-0 ms-1 text-[var(--muted)] transition-transform duration-200
                      ${open ? '' : '[transform:rotate(-90deg)] rtl:[transform:rotate(90deg)]'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <div className="max-h-44 overflow-y-auto space-y-0.5 pb-3 pe-1">
          {items.map(([value, count]) => {
            const active = selected.has(value)
            return (
              <button
                key={value}
                onClick={() => onToggle(value)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg
                            text-start text-[13px] transition-all ${
                  active
                    ? 'bg-[var(--accent-tint)] text-[var(--accent)] font-semibold'
                    : 'text-[var(--ink)] hover:bg-[var(--accent-tint)] hover:text-[var(--accent)]'
                }`}
              >
                <span className="truncate me-2 leading-snug">{value}</span>
                <span
                  className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--bg)', color: 'var(--muted)' }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
const FILTERS = ['all', 'unwatched', 'watched', 'saved']

export default function HomePage() {
  const { t } = useLang()
  const { refreshKey, openEditModal } = useLibrary()
  const { session } = useAuth()

  const [videos,    setVideos]    = useState([])
  const [loadState, setLoadState] = useState('loading')
  const [search,    setSearch]    = useState('')
  const [activeFilter, setFilter] = useState('all')

  // ── Sidebar facet filters ─────────────────────────────────────────────────
  const [selectedTags,     setSelectedTags]     = useState(() => new Set())
  const [selectedChannels, setSelectedChannels] = useState(() => new Set())
  const [selectedDomains,  setSelectedDomains]  = useState(() => new Set())
  const [sidebarOpen,      setSidebarOpen]       = useState(false)

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchVideos = useCallback(async () => {
    const uid = session?.user?.id
    if (!uid) { console.log('[FETCH] skipped — no uid'); return }
    setLoadState('loading')
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('id, title, channel, thumbnail_url, domain, tags, watch_status, saved_for_later, created_at, youtube_id, notes, prompts, links, intent, url')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
      if (error) throw error
      setVideos(data ?? [])
      setLoadState('ok')
    } catch (err) {
      console.error('[FETCH] error:', err)
      setLoadState('error')
    }
  }, [session?.user?.id])

  useEffect(() => { fetchVideos() }, [fetchVideos, refreshKey])

  // ── Stats (from ALL videos) ───────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     videos.length,
    watched:   videos.filter(v => v.watch_status === 'watched').length,
    remaining: videos.filter(v => v.watch_status !== 'watched').length,
    saved:     videos.filter(v => v.saved_for_later).length,
  }), [videos])

  // ── Facet counts (from ALL videos, hide zeros) ───────────────────────────
  const tagCounts = useMemo(() => {
    const map = {}
    videos.forEach(v => normTags(v.tags).forEach(tag => { map[tag] = (map[tag] ?? 0) + 1 }))
    return Object.entries(map).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1])
  }, [videos])

  const channelCounts = useMemo(() => {
    const map = {}
    videos.forEach(v => { if (v.channel) map[v.channel] = (map[v.channel] ?? 0) + 1 })
    return Object.entries(map).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1])
  }, [videos])

  const domainCounts = useMemo(() => {
    const map = {}
    videos.forEach(v => { if (v.domain) map[v.domain] = (map[v.domain] ?? 0) + 1 })
    return Object.entries(map).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1])
  }, [videos])

  // ── Filtered videos (status AND facets AND search) ───────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return videos.filter(v => {
      // Status
      if (activeFilter === 'unwatched' && v.watch_status !== 'unwatched') return false
      if (activeFilter === 'watched'   && v.watch_status !== 'watched')   return false
      if (activeFilter === 'saved'     && !v.saved_for_later)             return false
      // Tags (OR within)
      if (selectedTags.size > 0 && !normTags(v.tags).some(t => selectedTags.has(t))) return false
      // Channels (OR within)
      if (selectedChannels.size > 0 && !selectedChannels.has(v.channel ?? '')) return false
      // Domains (OR within)
      if (selectedDomains.size > 0 && !selectedDomains.has(v.domain ?? '')) return false
      // Search
      if (q) {
        const promptTexts = Array.isArray(v.prompts) ? v.prompts.map(p => p?.text ?? '') : []
        const linkTexts   = Array.isArray(v.links)   ? v.links.flatMap(l => [l?.url ?? '', l?.label ?? '']) : []
        const haystack = [v.title, v.channel, ...normTags(v.tags), v.notes ?? '', v.intent ?? '', ...promptTexts, ...linkTexts]
          .filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [videos, activeFilter, selectedTags, selectedChannels, selectedDomains, search])

  // ── Status pill counts (from ALL videos) ─────────────────────────────────
  const filterCounts = useMemo(() => ({
    all:       videos.length,
    unwatched: videos.filter(v => v.watch_status === 'unwatched').length,
    watched:   stats.watched,
    saved:     stats.saved,
  }), [videos, stats])

  // ── Clear all filters ─────────────────────────────────────────────────────
  const hasActiveFilters = selectedTags.size > 0 || selectedChannels.size > 0 || selectedDomains.size > 0

  const clearAllFilters = () => {
    setSelectedTags(new Set())
    setSelectedChannels(new Set())
    setSelectedDomains(new Set())
    setFilter('all')
    setSearch('')
  }

  const totalActiveFacets = selectedTags.size + selectedChannels.size + selectedDomains.size

  // ── Optimistic updates ───────────────────────────────────────────────────
  const patch = (id, changes) =>
    setVideos(prev => prev.map(v => v.id === id ? { ...v, ...changes } : v))

  const handleToggleWatched = useCallback(async (video) => {
    const next = video.watch_status === 'watched' ? 'unwatched' : 'watched'
    patch(video.id, { watch_status: next })
    const { error } = await supabase.from('videos').update({ watch_status: next }).eq('id', video.id)
    if (error) patch(video.id, { watch_status: video.watch_status })
  }, [])

  const handleToggleSaved = useCallback(async (video) => {
    const next = !video.saved_for_later
    patch(video.id, { saved_for_later: next })
    const { error } = await supabase.from('videos').update({ saved_for_later: next }).eq('id', video.id)
    if (error) patch(video.id, { saved_for_later: video.saved_for_later })
  }, [])

  const handleDelete = useCallback(async (video) => {
    setVideos(prev => prev.filter(v => v.id !== video.id))
    const { error } = await supabase.from('videos').delete().eq('id', video.id)
    if (error) setVideos(prev => [video, ...prev])
  }, [])

  const filterLabel = {
    all: t.filterAll, unwatched: t.filterUnwatched, watched: t.filterWatched, saved: t.filterSaved,
  }

  // ── Sidebar panel ────────────────────────────────────────────────────────
  const hasFacets = tagCounts.length > 0 || channelCounts.length > 0 || domainCounts.length > 0

  const SidebarPanel = () => (
    <div
      className="bg-[var(--card)] rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
    >
      {/* Clear button */}
      {hasActiveFilters && (
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={clearAllFilters}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl
                       text-xs font-semibold border border-[var(--danger)]
                       text-[var(--danger)] hover:bg-[var(--danger-tint)] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
            </svg>
            {t.clearFilters}
          </button>
        </div>
      )}

      <div className="px-3 pb-2 pt-1 space-y-0">
        <FilterGroup
          title={t.tagsTitle}
          icon="🏷️"
          items={tagCounts}
          selected={selectedTags}
          onToggle={v => toggleSet(setSelectedTags, v)}
        />
        <FilterGroup
          title={t.channelsFilter}
          icon="📺"
          items={channelCounts}
          selected={selectedChannels}
          onToggle={v => toggleSet(setSelectedChannels, v)}
        />
        <FilterGroup
          title={t.domainsFilter}
          icon="🌐"
          items={domainCounts}
          selected={selectedDomains}
          onToggle={v => toggleSet(setSelectedDomains, v)}
        />
      </div>
    </div>
  )

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

      {/* ── Stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t.statsTotal}     value={stats.total}     icon="🎬"
          iconBg="bg-gray-100 dark:bg-gray-800/80"/>
        <StatCard label={t.statsWatched}   value={stats.watched}   icon="✓"
          iconBg="bg-[var(--accent-tint)]" accentValue/>
        <StatCard label={t.statsRemaining} value={stats.remaining} icon="⏳"
          iconBg="bg-amber-50 dark:bg-amber-900/20"/>
        <StatCard label={t.statsSaved}     value={stats.saved}     icon="🔖"
          iconBg="bg-sky-50 dark:bg-sky-900/20"/>
      </div>

      {/* ── Search + mobile filter toggle ─────────────────────────── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 start-4 flex items-center pointer-events-none text-[var(--muted)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full ps-12 pe-4 py-3 rounded-full border border-[var(--border)]
                       bg-[var(--card)] text-[var(--ink)]
                       placeholder:text-[var(--muted)] focus:outline-none focus:ring-2
                       focus:ring-primary-500 focus:border-transparent transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 end-4 flex items-center text-[var(--muted)] hover:text-[var(--ink)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>

        {/* Mobile: toggle filter sidebar */}
        {hasFacets && (
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className={`md:hidden relative flex items-center gap-1.5 px-4 py-2.5 rounded-full
                        border font-medium text-sm transition-all shrink-0 ${
              sidebarOpen || hasActiveFilters
                ? 'bg-gray-900 dark:bg-primary-500 text-white border-transparent'
                : 'bg-[var(--card)] text-[var(--muted)] border-[var(--border)] hover:bg-[var(--accent-tint)] hover:text-[var(--accent)]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4h18M7 10h10M10 16h4"/>
            </svg>
            {t.showFilters}
            {totalActiveFacets > 0 && (
              <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-[var(--accent)] text-white
                               text-[9px] font-bold flex items-center justify-center">
                {totalActiveFacets}
              </span>
            )}
          </button>
        )}
      </div>

      {/* ── Status Filter Pills ────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTERS.map(f => (
          <FilterPill
            key={f}
            label={filterLabel[f]}
            count={filterCounts[f]}
            active={activeFilter === f}
            onClick={() => setFilter(f)}
          />
        ))}
      </div>

      {/* ── Two-column layout: sidebar + content ──────────────────── */}
      <div className="flex gap-5 items-start">

        {/* ── Sidebar: first in DOM = right in RTL, left in LTR ─── */}
        {hasFacets && (
          <>
            {/* Desktop sidebar — always visible */}
            <aside className="hidden md:block w-56 shrink-0 sticky top-20">
              <SidebarPanel />
            </aside>

            {/* Mobile sidebar — toggled */}
            {sidebarOpen && (
              <div className="md:hidden w-full">
                <SidebarPanel />
              </div>
            )}
          </>
        )}

        {/* ── Main content ────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Loading */}
          {loadState === 'loading' && (
            <div className="flex items-center justify-center py-24 gap-3 text-[var(--accent)]">
              <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <span className="text-lg font-medium">{t.loading}</span>
            </div>
          )}

          {/* Error */}
          {loadState === 'error' && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="text-5xl">⚠️</div>
              <p className="text-lg font-semibold text-[var(--ink)]">{t.errorLoad}</p>
              <button
                onClick={fetchVideos}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
              >
                {t.retry}
              </button>
            </div>
          )}

          {/* Empty library */}
          {loadState === 'ok' && videos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="w-24 h-24 bg-[var(--bg)] rounded-3xl flex items-center justify-center"
                   style={{ border: '1px solid var(--border)' }}>
                <svg className="w-12 h-12 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
              </div>
              <div>
                <p className="text-xl font-bold text-[var(--ink)]">{t.noVideos}</p>
                <p className="text-sm text-[var(--muted)] mt-1">{t.noVideosDesc}</p>
              </div>
            </div>
          )}

          {/* No results from filters/search */}
          {loadState === 'ok' && videos.length > 0 && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <div className="text-5xl">🔍</div>
              <p className="text-lg font-bold text-[var(--ink)]">{t.noResults}</p>
              <p className="text-sm text-[var(--muted)]">{t.noResultsDesc}</p>
              <button
                onClick={clearAllFilters}
                className="mt-2 px-5 py-2 text-sm bg-[var(--accent-tint)] hover:bg-[var(--accent-soft)]
                           text-[var(--accent)] rounded-full font-medium transition-colors"
              >
                {t.clearFilters}
              </button>
            </div>
          )}

          {/* Video grid */}
          {loadState === 'ok' && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(video => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onToggleWatched={() => handleToggleWatched(video)}
                  onToggleSaved={() => handleToggleSaved(video)}
                  onDelete={() => handleDelete(video)}
                  onEdit={openEditModal}
                />
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── Legal links ───────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3 text-xs text-[var(--muted)] pt-4">
        <a href="/privacy-policy.html" target="_blank" rel="noopener"
           className="hover:text-[var(--accent)] transition-colors">{t.footerPrivacy}</a>
        <span>·</span>
        <a href="/terms-of-use.html" target="_blank" rel="noopener"
           className="hover:text-[var(--accent)] transition-colors">{t.footerTerms}</a>
        <span>·</span>
        <a href="/about-us.html" target="_blank" rel="noopener"
           className="hover:text-[var(--accent)] transition-colors">{t.footerAbout}</a>
      </div>
    </div>
  )
}

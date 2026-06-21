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

// ── Stat Card (Fynix style: icon box + value + label) ────────────────────────
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

// ── Main ─────────────────────────────────────────────────────────────────────
const FILTERS = ['all', 'unwatched', 'watched', 'saved']

export default function HomePage() {
  const { t } = useLang()
  const { refreshKey } = useLibrary()
  const { session } = useAuth()

  const [videos, setVideos]         = useState([])
  const [loadState, setLoadState]   = useState('loading') // 'loading' | 'ok' | 'error'
  const [search, setSearch]         = useState('')
  const [activeFilter, setFilter]   = useState('all')
  const [activeTag, setTag]         = useState(null)

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchVideos = useCallback(async () => {
    const uid = session?.user?.id
    if (!uid) { console.log('[FETCH] skipped — no uid'); return }
    console.log('[FETCH] start uid:', uid)
    setLoadState('loading')
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('id, title, channel, thumbnail_url, domain, tags, watch_status, saved_for_later, created_at, youtube_id, notes, prompts, links')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
      if (error) throw error
      console.log('[FETCH] done — rows:', data?.length ?? 0)
      setVideos(data ?? [])
      setLoadState('ok')
    } catch (err) {
      console.error('[FETCH] error:', err)
      setLoadState('error')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  // Re-fetch when a video is added (refreshKey increments via LibraryContext)
  useEffect(() => { fetchVideos() }, [fetchVideos, refreshKey])

  // ── Stats (computed from ALL videos, unfiltered) ─────────────────────────
  const stats = useMemo(() => ({
    total:     videos.length,
    watched:   videos.filter(v => v.watch_status === 'watched').length,
    remaining: videos.filter(v => v.watch_status !== 'watched').length,
    saved:     videos.filter(v => v.saved_for_later).length,
  }), [videos])

  // ── Tag counts ───────────────────────────────────────────────────────────
  const tagCounts = useMemo(() => {
    const map = {}
    videos.forEach(v => normTags(v.tags).forEach(tag => { map[tag] = (map[tag] ?? 0) + 1 }))
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [videos])

  // ── Filtered videos ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return videos.filter(v => {
      // Quick filter
      if (activeFilter === 'unwatched' && v.watch_status !== 'unwatched') return false
      if (activeFilter === 'watched'   && v.watch_status !== 'watched')   return false
      if (activeFilter === 'saved'     && !v.saved_for_later)             return false
      // Tag filter
      if (activeTag && !normTags(v.tags).includes(activeTag)) return false
      // Search (title + channel + tags + notes + prompts + links)
      if (q) {
        const promptTexts = Array.isArray(v.prompts) ? v.prompts.map(p => p?.text ?? '') : []
        const linkTexts   = Array.isArray(v.links)   ? v.links.flatMap(l => [l?.url ?? '', l?.label ?? '']) : []
        const haystack = [v.title, v.channel, ...normTags(v.tags), v.notes ?? '', ...promptTexts, ...linkTexts]
          .filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [videos, activeFilter, activeTag, search])

  // ── Filter counts (for pills) ────────────────────────────────────────────
  const filterCounts = useMemo(() => ({
    all:       videos.length,
    unwatched: videos.filter(v => v.watch_status === 'unwatched').length,
    watched:   stats.watched,
    saved:     stats.saved,
  }), [videos, stats])

  // ── Optimistic update helpers ────────────────────────────────────────────
  const patch = (id, changes) =>
    setVideos(prev => prev.map(v => v.id === id ? { ...v, ...changes } : v))

  const handleToggleWatched = useCallback(async (video) => {
    const next = video.watch_status === 'watched' ? 'unwatched' : 'watched'
    patch(video.id, { watch_status: next })
    const { error } = await supabase.from('videos').update({ watch_status: next }).eq('id', video.id)
    if (error) patch(video.id, { watch_status: video.watch_status }) // revert
  }, [])

  const handleToggleSaved = useCallback(async (video) => {
    const next = !video.saved_for_later
    patch(video.id, { saved_for_later: next })
    const { error } = await supabase.from('videos').update({ saved_for_later: next }).eq('id', video.id)
    if (error) patch(video.id, { saved_for_later: video.saved_for_later }) // revert
  }, [])

  const handleDelete = useCallback(async (video) => {
    setVideos(prev => prev.filter(v => v.id !== video.id))
    const { error } = await supabase.from('videos').delete().eq('id', video.id)
    if (error) setVideos(prev => [video, ...prev]) // revert
  }, [])

  // ── Filter label map ─────────────────────────────────────────────────────
  const filterLabel = { all: t.filterAll, unwatched: t.filterUnwatched, watched: t.filterWatched, saved: t.filterSaved }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* ── Stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t.statsTotal}     value={stats.total}     icon="🎬"
          iconBg="bg-gray-100 dark:bg-gray-800/80"/>
        <StatCard label={t.statsWatched}   value={stats.watched}   icon="✓"
          iconBg="bg-[var(--accent-tint)]"
          accentValue/>
        <StatCard label={t.statsRemaining} value={stats.remaining} icon="⏳"
          iconBg="bg-amber-50 dark:bg-amber-900/20"/>
        <StatCard label={t.statsSaved}     value={stats.saved}     icon="🔖"
          iconBg="bg-sky-50 dark:bg-sky-900/20"/>
      </div>

      {/* ── Search ────────────────────────────────────────────────── */}
      <div className="relative">
        <div className="absolute inset-y-0 start-4 flex items-center pointer-events-none text-gray-400">
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
            className="absolute inset-y-0 end-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Quick Filters ─────────────────────────────────────────── */}
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

      {/* ── Tags Panel ───────────────────────────────────────────── */}
      {tagCounts.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            {t.tagsTitle}
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTag(null)}
              className={`
                text-xs px-3 py-1.5 rounded-full font-medium transition-all
                ${activeTag === null
                  ? 'bg-gray-900 dark:bg-primary-500 text-white shadow-sm'
                  : 'bg-[var(--accent-tint)] text-[var(--success)] hover:bg-[var(--accent-soft)]'}
              `}
            >
              {t.allTags}
            </button>
            {tagCounts.map(([tag, count]) => (
              <button
                key={tag}
                onClick={() => setTag(activeTag === tag ? null : tag)}
                className={`
                  flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium transition-all
                  ${activeTag === tag
                    ? 'bg-gray-900 dark:bg-primary-500 text-white shadow-sm'
                    : 'bg-[var(--accent-tint)] text-[var(--success)] hover:bg-[var(--accent-soft)]'}
                `}
              >
                {tag}
                <span className={`text-[10px] px-1.5 rounded-full ${activeTag === tag ? 'bg-white/25' : 'bg-[var(--accent-soft)]'}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Content ──────────────────────────────────────────────── */}
      {loadState === 'loading' && (
        <div className="flex items-center justify-center py-24 gap-3 text-[var(--accent)]">
          <svg className="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span className="text-lg font-medium">{t.loading}</span>
        </div>
      )}

      {loadState === 'error' && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="text-5xl">⚠️</div>
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">{t.errorLoad}</p>
          <button
            onClick={fetchVideos}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
          >
            {t.retry}
          </button>
        </div>
      )}

      {loadState === 'ok' && videos.length === 0 && (
        /* No videos at all */
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{t.noVideos}</p>
            <p className="text-sm text-gray-400 mt-1">{t.noVideosDesc}</p>
          </div>
        </div>
      )}

      {loadState === 'ok' && videos.length > 0 && filtered.length === 0 && (
        /* Has videos but nothing matches filters */
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="text-5xl">🔍</div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{t.noResults}</p>
          <p className="text-sm text-gray-400">{t.noResultsDesc}</p>
          <button
            onClick={() => { setSearch(''); setFilter('all'); setTag(null) }}
            className="mt-2 px-5 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
                       text-gray-700 dark:text-gray-200 rounded-xl font-medium transition-colors"
          >
            {t.filterAll}
          </button>
        </div>
      )}

      {loadState === 'ok' && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(video => (
            <VideoCard
              key={video.id}
              video={video}
              onToggleWatched={() => handleToggleWatched(video)}
              onToggleSaved={() => handleToggleSaved(video)}
              onDelete={() => handleDelete(video)}
            />
          ))}
        </div>
      )}

    </main>
  )
}

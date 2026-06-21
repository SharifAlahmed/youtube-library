import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import VideoPlayerModal from '../components/VideoPlayerModal'

export default function PromptsPage() {
  const { session } = useAuth()
  const { t } = useLang()

  const [rows, setRows]           = useState([])
  const [loadState, setLoadState] = useState('loading')
  const [search, setSearch]       = useState('')
  const [copiedKey, setCopiedKey] = useState(null)
  const [activeVideo, setActiveVideo] = useState(null)

  const fetchAllPrompts = useCallback(async () => {
    const uid = session?.user?.id
    if (!uid) return
    setLoadState('loading')
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('id, title, channel, youtube_id, prompts')
        .eq('user_id', uid)
        .not('prompts', 'is', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      const flat = []
      for (const video of (data ?? [])) {
        const arr = Array.isArray(video.prompts) ? video.prompts : []
        for (const p of arr) {
          if (!p?.text) continue
          flat.push({
            key: `${video.id}-${p.createdAt ?? flat.length}`,
            videoId:    video.id,
            videoTitle: video.title,
            youtubeId:  video.youtube_id,
            channel:    video.channel,
            text:       p.text,
            createdAt:  p.createdAt,
          })
        }
      }
      setRows(flat)
      setLoadState('ok')
    } catch {
      setLoadState('error')
    }
  }, [session?.user?.id])

  useEffect(() => { fetchAllPrompts() }, [fetchAllPrompts])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r =>
      r.text.toLowerCase().includes(q) ||
      (r.videoTitle ?? '').toLowerCase().includes(q)
    )
  }, [rows, search])

  const handleCopy = (key, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2000)
    })
  }

  const openVideo = (row) => {
    setActiveVideo({ id: row.videoId, title: row.videoTitle, channel: row.channel, youtube_id: row.youtubeId })
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t.myPrompts}</h1>
        {loadState === 'ok' && rows.length > 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filtered.length} / {rows.length}
          </span>
        )}
      </div>

      {/* Search */}
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
          placeholder={t.searchPromptsPlaceholder}
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

      {/* States */}
      {loadState === 'loading' && (
        <div className="flex items-center justify-center py-24 gap-3 text-primary-600">
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
            onClick={fetchAllPrompts}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
          >
            {t.retry}
          </button>
        </div>
      )}

      {loadState === 'ok' && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <div className="text-5xl">💬</div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {search ? t.noResults : t.noPromptsGlobal}
          </p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="mt-2 px-5 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
                         text-gray-700 dark:text-gray-200 rounded-xl font-medium transition-colors"
            >
              {t.filterAll}
            </button>
          )}
        </div>
      )}

      {loadState === 'ok' && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map(row => (
            <div
              key={row.key}
              className="bg-[var(--card)] rounded-2xl p-4 space-y-3"
              style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
            >
              {/* Source video */}
              <button
                onClick={() => openVideo(row)}
                className="flex items-center gap-2 w-full text-start group"
              >
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
                <span className="text-sm text-primary-600 dark:text-primary-400 group-hover:underline line-clamp-1">
                  {row.videoTitle}
                </span>
              </button>

              {/* Prompt text + copy button */}
              <div className="flex gap-3 items-start">
                <pre
                  className="flex-1 rounded-xl px-3 py-2.5 text-xs whitespace-pre-wrap font-mono overflow-x-auto"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--ink)',
                  }}
                >
                  {row.text}
                </pre>
                <button
                  onClick={() => handleCopy(row.key, row.text)}
                  className={`
                    shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap
                    ${copiedKey === row.key
                      ? 'bg-primary-600 text-white'
                      : 'bg-[var(--accent-tint)] text-[var(--success)] hover:bg-[var(--accent-soft)]'}
                  `}
                >
                  {copiedKey === row.key ? t.copied : t.copyPrompt}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeVideo && (
        <VideoPlayerModal video={activeVideo} onClose={() => setActiveVideo(null)} />
      )}
    </main>
  )
}

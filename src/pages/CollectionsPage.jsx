import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import VideoPlayerModal from '../components/VideoPlayerModal'
import LuminaverseIcon from '../components/LuminaverseIcon'

// ── Constants ─────────────────────────────────────────────────────────────────
const EMOJI_PRESETS = ['📚', '🎯', '💡', '🔥', '⭐', '🎬', '🚀', '🎓', '💻', '🎨', '🏆', '🔖']

// ── Shared helpers ────────────────────────────────────────────────────────────
function toArr(raw) { return Array.isArray(raw) ? raw : [] }

// ── MiniThumb ─────────────────────────────────────────────────────────────────
function MiniThumb({ src, title, youtubeId }) {
  const [err, setErr] = useState(false)
  const fallback = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/default.jpg` : null
  const imgSrc = !err && src ? src : fallback

  if (!imgSrc || (err && !fallback)) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
        <LuminaverseIcon className="w-6 h-6" />
      </div>
    )
  }
  return <img src={imgSrc} alt={title} onError={() => setErr(true)} className="w-full h-full object-cover" />
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ size = 'w-5 h-5' }) {
  return (
    <svg className={`animate-spin ${size} text-primary-600`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

// ── TagInput (shared between both modals) ─────────────────────────────────────
function TagInput({ tags, setTags, placeholder }) {
  const [input, setInput] = useState('')

  const commit = (raw) => {
    raw.split(',').map(s => s.trim()).filter(Boolean).forEach(tag => {
      setTags(prev => prev.includes(tag) ? prev : [...prev, tag])
    })
  }

  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2.5 rounded-xl border border-[var(--border)]
                    bg-[var(--bg)] focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
      {tags.map(tag => (
        <span key={tag}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full"
          style={{ background: 'var(--accent-tint)', color: 'var(--success)' }}>
          {tag}
          <button type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))}
            className="hover:text-red-500 transition-colors">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(input); setInput('') }
          if (e.key === 'Backspace' && !input && tags.length) setTags(prev => prev.slice(0, -1))
        }}
        onBlur={() => { if (input.trim()) { commit(input); setInput('') } }}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[80px] bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
      />
    </div>
  )
}

// ── CollectionFormModal (create & edit) ───────────────────────────────────────
function CollectionFormModal({ heading, initial, onSubmit, onClose, t, showTags }) {
  const [name, setName]       = useState(initial?.name ?? '')
  const [icon, setIcon]       = useState(initial?.icon ?? '')
  const [tags, setTags]       = useState(toArr(initial?.tags))
  // Local reveal for THIS modal only — doesn't change the global setting
  const [tagsRevealed, setTagsRevealed] = useState(() => toArr(initial?.tags).length > 0)
  const [saving, setSaving]   = useState(false)
  const [saveError, setSaveError] = useState('')

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSaving(true)
    setSaveError('')
    try {
      await onSubmit({ name: name.trim(), icon: icon.trim(), tags })
      // parent closes modal on success — don't setSaving(false) here to avoid unmounted-component warning
    } catch (err) {
      setSaveError(err.message ?? t.errGeneric)
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{heading}</h2>
          <button onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Emoji presets */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.collectionIcon}</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {EMOJI_PRESETS.map(e => (
                <button key={e} onClick={() => setIcon(icon === e ? '' : e)}
                  className={`text-xl w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                    icon === e
                      ? 'bg-primary-100 dark:bg-primary-900/40 ring-2 ring-primary-500'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={icon}
              onChange={e => setIcon(e.target.value)}
              placeholder={t.collectionIconPlaceholder}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600
                         bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.collectionName}<span className="text-red-500 ms-0.5">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder={t.collectionNamePlaceholder}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                         bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Tags — hidden unless show_tags is on or revealed locally */}
          {!showTags && !tagsRevealed && (
            <button
              type="button"
              onClick={() => setTagsRevealed(true)}
              className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500
                         hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              {t.addTagsOptional}
            </button>
          )}
          {(showTags || tagsRevealed) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {t.tagsLabel}
              </label>
              <TagInput tags={tags} setTags={setTags} placeholder={t.tagsPlaceholder} />
            </div>
          )}
        </div>

        {/* Error banner */}
        {saveError && (
          <div className="mx-6 mb-2 px-3 py-2 rounded-xl text-sm text-red-600 dark:text-red-400
                          bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30">
            {saveError}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-sm
                       text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            {t.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-colors
                       bg-primary-600 hover:bg-primary-700 text-white
                       disabled:opacity-60 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {saving && <Spinner size="w-4 h-4" />}
            {initial ? t.save : t.createCollection}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── AddVideosModal ────────────────────────────────────────────────────────────
function AddVideosModal({ existingVideoIds, uid, onAdd, onClose, t }) {
  const existingRef = useRef(existingVideoIds)
  const [allVideos, setAllVideos] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState(new Set())
  const [saving, setSaving]       = useState(false)
  const [addError, setAddError]   = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('videos')
        .select('id, title, channel, thumbnail_url, youtube_id')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
      setAllVideos((data ?? []).filter(v => !existingRef.current.includes(v.id)))
      setLoading(false)
    }
    load()
  }, [uid])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allVideos
    return allVideos.filter(v =>
      (v.title ?? '').toLowerCase().includes(q) ||
      (v.channel ?? '').toLowerCase().includes(q)
    )
  }, [allVideos, search])

  const toggle = (id) => setSelected(prev => {
    const n = new Set(prev)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const handleAdd = async () => {
    if (selected.size === 0) return
    setSaving(true)
    setAddError('')
    try {
      await onAdd([...selected])
      onClose()
    } catch (err) {
      setAddError(err.message ?? t.errGeneric)
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[80dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t.addVideosToCollection}</h2>
            {!loading && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {allVideos.length} {t.videosAvailable}
              </p>
            )}
          </div>
          <button onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="relative">
            <div className="absolute inset-y-0 start-3 flex items-center pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full ps-9 pe-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600
                         bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
          </div>
        </div>

        {/* Video list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
              {allVideos.length === 0 ? t.noVideosInCollection : t.noResults}
            </p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map(video => (
                <label
                  key={video.id}
                  className="flex items-center gap-3 px-4 py-3
                             hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(video.id)}
                    onChange={() => toggle(video.id)}
                    className="w-4 h-4 rounded text-primary-600 border-gray-300 dark:border-gray-600 focus:ring-primary-500"
                  />
                  <div className="w-16 h-9 rounded-lg overflow-hidden shrink-0">
                    <MiniThumb src={video.thumbnail_url} title={video.title} youtubeId={video.youtube_id}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">{video.title}</p>
                    {video.channel && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{video.channel}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Error banner */}
        {addError && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl text-sm text-red-600 dark:text-red-400
                          bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 shrink-0">
            {addError}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-3 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-3 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-sm
                       text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            {t.cancel}
          </button>
          <button
            onClick={handleAdd}
            disabled={selected.size === 0 || saving}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-colors
                       bg-primary-600 hover:bg-primary-700 text-white
                       disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400
                       flex items-center justify-center gap-2"
          >
            {saving && <Spinner size="w-4 h-4" />}
            {t.addSelected}{selected.size > 0 ? ` (${selected.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CollectionVideoCard ───────────────────────────────────────────────────────
function CollectionVideoCard({ video, onPlay, onToggleWatched, onRemove, t }) {
  const isWatched = video.watch_status === 'watched'
  const [confirmRm, setConfirmRm] = useState(false)
  const [busy, setBusy]           = useState(false)

  const run = async (fn) => {
    if (busy) return
    setBusy(true)
    await fn()
    setBusy(false)
  }

  return (
    <article className="group flex flex-col rounded-2xl overflow-hidden
                        bg-[var(--card)]
                        transition-all duration-200 hover:-translate-y-0.5"
             style={{
               border: '1px solid var(--border)',
               boxShadow: 'var(--shadow-card)',
             }}>
      {/* Thumbnail */}
      <div
        className="relative aspect-video cursor-pointer overflow-hidden"
        onClick={onPlay}
      >
        <MiniThumb src={video.thumbnail_url} title={video.title} youtubeId={video.youtube_id}/>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors pointer-events-none"/>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2.5">
            <svg className="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
        {isWatched && (
          <div className="absolute top-2 start-2 flex items-center gap-1
                          text-[10px] font-semibold px-2 py-0.5 rounded-full"
               style={{ background: 'var(--success-tint)', color: 'var(--success)' }}>
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"/>
            </svg>
            {t.watched}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-3 gap-1.5">
        <h3
          className="text-sm font-medium line-clamp-2 cursor-pointer
                     hover:text-[var(--accent)] transition-colors leading-snug"
          style={{ color: 'var(--ink)' }}
          onClick={onPlay}
        >
          {video.title}
        </h3>
        {video.channel && (
          <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{video.channel}</p>
        )}
        <div className="flex-1"/>

        {/* Footer: Remove (left) + Watched toggle (right) */}
        <div className="pt-2 flex items-center justify-between"
             style={{ borderTop: '1px solid var(--border)' }}>
          {confirmRm ? (
            <div className="flex gap-1.5 w-full">
              <button
                onClick={onRemove}
                className="flex-1 text-xs px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
              >
                {t.confirmDelete}
              </button>
              <button
                onClick={() => setConfirmRm(false)}
                className="flex-1 text-xs px-2.5 py-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {t.cancel}
              </button>
            </div>
          ) : (
            <>
              {/* Remove from collection */}
              <button
                onClick={() => setConfirmRm(true)}
                disabled={busy}
                className="text-xs px-2.5 py-1 rounded-lg text-gray-400
                           hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20
                           transition-colors disabled:opacity-40"
              >
                {t.removeFromCollection}
              </button>

              {/* Watched toggle — same style as library card */}
              <button
                onClick={() => run(onToggleWatched)}
                disabled={busy}
                title={isWatched ? t.markUnwatched : t.markWatched}
                className="flex items-center justify-center transition-colors disabled:opacity-40"
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '6px',
                  background: isWatched ? 'rgba(34,197,94,0.1)' : 'transparent',
                  color: isWatched ? 'rgb(21,128,60)' : 'rgb(104,111,125)',
                }}
              >
                <svg
                  className="w-[15px] h-[15px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={isWatched ? 2.5 : 1.75}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CollectionsPage() {
  const { session, showTags } = useAuth()
  const { t }       = useLang()
  const uid = session?.user?.id

  const [collections, setCollections]   = useState([])
  const [videoCounts, setVideoCounts]   = useState({})
  const [colsLoading, setColsLoading]   = useState(true)

  const [selectedId, setSelectedId]     = useState(null)
  const [colVideos, setColVideos]       = useState([])
  const [cvLoading, setCvLoading]       = useState(false)
  const [cvError, setCvError]           = useState('')

  const [showCreate, setShowCreate]     = useState(false)
  const [editTarget, setEditTarget]     = useState(null)
  const [showAddVids, setShowAddVids]   = useState(false)
  const [confirmDel, setConfirmDel]     = useState(false)
  const [activeVideo, setActiveVideo]   = useState(null)

  // ── Load all collections + sidebar counts ─────────────────────────────────
  const loadCollections = useCallback(async () => {
    if (!uid) return
    setColsLoading(true)
    try {
      const { data: cols, error } = await supabase
        .from('collections')
        .select('id, name, icon, tags, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: true })
      if (error) throw error
      const list = cols ?? []
      setCollections(list)

      if (list.length) {
        const { data: cv } = await supabase
          .from('collection_videos')
          .select('collection_id')
          .in('collection_id', list.map(c => c.id))
        const counts = {}
        ;(cv ?? []).forEach(r => { counts[r.collection_id] = (counts[r.collection_id] ?? 0) + 1 })
        setVideoCounts(counts)
      }
    } finally {
      setColsLoading(false)
    }
  }, [uid])

  useEffect(() => { loadCollections() }, [loadCollections])

  // ── Load videos for the selected collection (2-step, no embed join) ─────────
  const loadColVideos = useCallback(async (colId) => {
    if (!colId || !uid) return
    setCvLoading(true)
    setCvError('')
    try {
      // Step 1: get video_ids for this collection
      const { data: cvRows, error: cvErr } = await supabase
        .from('collection_videos')
        .select('video_id')
        .eq('collection_id', colId)
      if (cvErr) {
        console.error('[Collections] fetch collection_videos failed:', cvErr)
        throw new Error(cvErr.message)
      }

      const videoIds = (cvRows ?? []).map(r => r.video_id).filter(Boolean)
      if (videoIds.length === 0) {
        setColVideos([])
        setVideoCounts(prev => ({ ...prev, [colId]: 0 }))
        return
      }

      // Step 2: fetch full video rows, scoped to this user for isolation
      const { data: videos, error: vErr } = await supabase
        .from('videos')
        .select('id, title, channel, thumbnail_url, youtube_id, watch_status')
        .in('id', videoIds)
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
      if (vErr) {
        console.error('[Collections] fetch videos failed:', vErr)
        throw new Error(vErr.message)
      }

      setColVideos(videos ?? [])
      setVideoCounts(prev => ({ ...prev, [colId]: (videos ?? []).length }))
    } catch (err) {
      setCvError(err.message)
    } finally {
      setCvLoading(false)
    }
  }, [uid])

  useEffect(() => {
    if (selectedId) loadColVideos(selectedId)
    else setColVideos([])
  }, [selectedId, loadColVideos])

  const selectedCol = collections.find(c => c.id === selectedId) ?? null

  // ── Stats (completion) ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total   = colVideos.length
    const watched = colVideos.filter(v => v.watch_status === 'watched').length
    const pct     = total > 0 ? Math.round((watched / total) * 100) : 0
    return { total, watched, pct }
  }, [colVideos])

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleCreate = async ({ name, icon, tags }) => {
    const { data, error } = await supabase
      .from('collections')
      .insert({ user_id: uid, name, icon: icon || null, tags: tags.length ? tags : null })
      .select('id, name, icon, tags, created_at')
      .single()
    if (error) {
      console.error('[Collections] insert failed:', error)
      throw new Error(error.message)
    }
    // Success: update sidebar, select new collection, close modal
    setCollections(prev => [...prev, data])
    setVideoCounts(prev => ({ ...prev, [data.id]: 0 }))
    setSelectedId(data.id)
    setShowCreate(false)
  }

  const handleEdit = async ({ name, icon, tags }) => {
    if (!editTarget) return
    const { data, error } = await supabase
      .from('collections')
      .update({ name, icon: icon || null, tags: tags.length ? tags : null })
      .eq('id', editTarget.id).eq('user_id', uid)
      .select('id, name, icon, tags, created_at')
      .single()
    if (error) {
      console.error('[Collections] update failed:', error)
      throw new Error(error.message)
    }
    setCollections(prev => prev.map(c => c.id === data.id ? data : c))
    setEditTarget(null)
  }

  const handleDelete = async () => {
    if (!selectedId) return
    // Delete junction rows first in case there's no CASCADE
    await supabase.from('collection_videos').delete().eq('collection_id', selectedId)
    await supabase.from('collections').delete().eq('id', selectedId).eq('user_id', uid)
    setCollections(prev => prev.filter(c => c.id !== selectedId))
    setVideoCounts(prev => { const n = { ...prev }; delete n[selectedId]; return n })
    setSelectedId(null)
    setColVideos([])
    setConfirmDel(false)
  }

  const handleRemoveVideo = async (videoId) => {
    await supabase
      .from('collection_videos')
      .delete()
      .eq('collection_id', selectedId)
      .eq('video_id', videoId)
    const next = colVideos.filter(v => v.id !== videoId)
    setColVideos(next)
    setVideoCounts(prev => ({ ...prev, [selectedId]: next.length }))
  }

  const handleToggleWatched = async (video) => {
    const next = video.watch_status === 'watched' ? 'unwatched' : 'watched'
    // Optimistic update
    setColVideos(prev => prev.map(v => v.id === video.id ? { ...v, watch_status: next } : v))
    const { error } = await supabase
      .from('videos')
      .update({ watch_status: next })
      .eq('id', video.id)
      .eq('user_id', uid)
    if (error) {
      console.error('[Collections] toggle watched failed:', error)
      // Revert
      setColVideos(prev => prev.map(v => v.id === video.id ? { ...v, watch_status: video.watch_status } : v))
    }
  }

  const handleAddVideos = async (videoIds) => {
    // AddVideosModal already filters out existing videos, so plain insert is safe.
    // Only send the columns that exist in the schema.
    const rows = videoIds.map(vid => ({
      collection_id: selectedId,
      video_id: vid,
    }))
    const { error } = await supabase
      .from('collection_videos')
      .insert(rows)
    if (error) {
      console.error('[Collections] add videos failed:', error)
      throw new Error(error.message)
    }
    await loadColVideos(selectedId)
  }

  // ── Select a collection, reset delete confirm ─────────────────────────────
  const handleSelectCol = (id) => {
    setSelectedId(id)
    setConfirmDel(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100dvh-4rem)]">

      {/* ── Sidebar (first in DOM = right in RTL, left in LTR) ── */}
      <aside className="w-full md:w-72 shrink-0 flex flex-col
                        bg-[var(--card)]
                        border-b md:border-b-0"
             style={{ borderInlineEnd: '1px solid var(--border)' }}>

        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border)]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            {t.collections}
          </h2>
          <button
            onClick={() => setShowCreate(true)}
            title={t.newCollection}
            className="p-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {colsLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : collections.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{t.noCollections}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t.noCollectionsDesc}</p>
            </div>
          ) : collections.map(col => {
            const active = selectedId === col.id
            return (
              <button
                key={col.id}
                onClick={() => handleSelectCol(col.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-start transition-colors ${
                  active
                    ? 'bg-[var(--accent-tint)] text-[var(--accent)]'
                    : 'hover:bg-[var(--accent-tint)] hover:text-[var(--accent)] text-[var(--muted)]'
                }`}
              >
                <span className="text-xl shrink-0">{col.icon || '📁'}</span>
                <span className="flex-1 text-sm font-medium truncate">{col.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                  active
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'bg-[var(--accent-tint)] text-[var(--muted)]'
                }`}>
                  {videoCounts[col.id] ?? 0}
                </span>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── Main panel ── */}
      <main className="flex-1 min-w-0 overflow-auto">
        {!selectedCol ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 text-center p-8">
            <div className="text-6xl">📂</div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{t.selectCollection}</p>
            {collections.length === 0 && !colsLoading && (
              <p className="text-sm text-gray-400">{t.noCollectionsDesc}</p>
            )}
          </div>
        ) : (
          <div className="p-6 space-y-6 max-w-6xl">

            {/* ── Collection header ── */}
            <div className="flex items-start justify-between gap-4 rounded-2xl p-5 -m-1"
                 style={{
                   background: 'linear-gradient(135deg, var(--accent-tint) 0%, var(--card) 70%)',
                   border: '1px solid var(--accent-soft)',
                 }}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-4xl shrink-0">{selectedCol.icon || '📁'}</span>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                    {selectedCol.name}
                  </h1>
                  {showTags && toArr(selectedCol.tags).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {toArr(selectedCol.tags).map(tag => (
                        <span key={tag}
                          className="text-xs px-2.5 py-0.5 rounded-full
                                     bg-primary-100 dark:bg-primary-900/40
                                     text-primary-700 dark:text-primary-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Edit / Delete */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { setEditTarget(selectedCol); setConfirmDel(false) }}
                  title={t.editCollection}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5
                         m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </button>
                {confirmDel ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleDelete}
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors"
                    >
                      {t.confirmDelete}
                    </button>
                    <button
                      onClick={() => setConfirmDel(false)}
                      className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-600
                                 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      {t.cancel}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDel(true)}
                    title={t.deleteCollection}
                    className="p-2 rounded-lg text-gray-500
                               hover:bg-red-50 dark:hover:bg-red-900/20
                               hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7
                           m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* ── Stats row ── */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4"
                   style={{ boxShadow: 'var(--shadow-card)' }}>
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base
                                  bg-gray-100 dark:bg-gray-800/60">🎬</div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--ink)]">{stats.total}</p>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5">{t.statsTotal}</p>
                  </div>
                </div>
              </div>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4"
                   style={{ boxShadow: 'var(--shadow-card)' }}>
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base
                                  bg-[var(--accent-tint)]">✓</div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--accent)]">{stats.watched}</p>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5">{t.statsWatched}</p>
                  </div>
                </div>
              </div>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4"
                   style={{ boxShadow: 'var(--shadow-card)' }}>
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base
                                  bg-sky-50 dark:bg-sky-900/20">📊</div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--ink)]">{stats.pct}%</p>
                    <p className="text-[11px] text-[var(--muted)] mt-0.5">{t.completion}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Progress bar ── */}
            {stats.total > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{t.statsWatched}</span>
                  <span>{stats.watched} / {stats.total}</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden"
                     style={{ background: 'var(--accent-tint)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.pct}%`, background: 'var(--accent-spring)' }}
                  />
                </div>
              </div>
            )}

            {/* ── Add Videos button ── */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddVids(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors
                           bg-primary-600 hover:bg-primary-700 text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
                </svg>
                {t.addToCollection}
              </button>
            </div>

            {/* ── Video grid ── */}
            {cvLoading ? (
              <div className="flex justify-center py-16"><Spinner size="w-6 h-6" /></div>
            ) : cvError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="text-4xl">⚠️</div>
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">{cvError}</p>
                <button
                  onClick={() => loadColVideos(selectedId)}
                  className="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors"
                >
                  {t.retry}
                </button>
              </div>
            ) : colVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14
                         M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                </div>
                <p className="text-base font-semibold text-gray-900 dark:text-white">{t.noVideosInCollection}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {colVideos.map(video => (
                  <CollectionVideoCard
                    key={video.id}
                    video={video}
                    onPlay={() => setActiveVideo(video)}
                    onToggleWatched={() => handleToggleWatched(video)}
                    onRemove={() => handleRemoveVideo(video.id)}
                    t={t}
                  />
                ))}
              </div>
            )}

          </div>
        )}
      </main>

      {/* ── Modals ── */}
      {showCreate && (
        <CollectionFormModal
          heading={t.newCollection}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
          t={t}
          showTags={showTags}
        />
      )}

      {editTarget && (
        <CollectionFormModal
          heading={t.editCollection}
          initial={editTarget}
          onSubmit={handleEdit}
          onClose={() => setEditTarget(null)}
          t={t}
          showTags={showTags}
        />
      )}

      {showAddVids && selectedId && (
        <AddVideosModal
          existingVideoIds={colVideos.map(v => v.id)}
          uid={uid}
          onAdd={handleAddVideos}
          onClose={() => setShowAddVids(false)}
          t={t}
        />
      )}

      {activeVideo && (
        <VideoPlayerModal video={activeVideo} onClose={() => setActiveVideo(null)} />
      )}
    </div>
  )
}

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { useLibrary } from '../context/LibraryContext'
import UpgradeModal from './UpgradeModal'

// ── Tag input helpers ────────────────────────────────────────────────────────
function parseTags(raw) {
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

// ── Thumbnail preview with hi-res fallback ───────────────────────────────────
function ThumbPreview({ src, title, youtubeId }) {
  const [useFallback, setUseFallback] = useState(false)
  const fallback = youtubeId
    ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    : null

  const imgSrc = useFallback ? fallback : src
  if (!imgSrc) return null

  return (
    <img
      src={imgSrc}
      alt={title}
      onError={() => { if (!useFallback && fallback) setUseFallback(true) }}
      className="w-24 h-14 object-cover rounded-lg flex-shrink-0 bg-gray-100 dark:bg-gray-700"
    />
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function AddVideoModal({ onClose }) {
  const { profile, session } = useAuth()
  const { t } = useLang()
  const { triggerRefresh } = useLibrary()

  // URL + fetch
  const [url, setUrl]             = useState('')
  const [fetchState, setFS]       = useState('idle')   // idle | loading | done | error
  const [fetchError, setFetchErr] = useState('')

  // Video fields
  const [title, setTitle]           = useState('')
  const [channel, setChannel]       = useState('')
  const [thumbnailUrl, setThumb]    = useState('')
  const [youtubeId, setYoutubeId]   = useState('')

  // Extra fields
  const [domain, setDomain]         = useState('')
  const [tags, setTags]             = useState([])
  const [tagInput, setTagInput]     = useState('')
  const [notes, setNotes]           = useState('')

  // Save
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState('')
  const [showUpgrade, setUpgrade]   = useState(false)

  const preferredDomains = Array.isArray(profile?.preferred_domains)
    ? profile.preferred_domains
    : []

  // ── Fetch oEmbed via edge function ────────────────────────────────────────
  const handleFetch = async () => {
    const raw = url.trim()
    if (!raw) return

    setFS('loading')
    setFetchErr('')

    try {
      const { data, error } = await supabase.functions.invoke('oembed', {
        body: { url: raw },
      })

      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)

      setTitle(data.title    ?? '')
      setChannel(data.channel ?? '')
      setThumb(data.thumbnail ?? '')
      setYoutubeId(data.youtube_id ?? '')
      setFS('done')
    } catch (err) {
      setFS('error')
      setFetchErr(err.message ?? t.fetchErrorGeneric)
    }
  }

  const handleUrlChange = (val) => {
    setUrl(val)
    // Reset fetched data when URL is cleared
    if (!val.trim()) {
      setFS('idle')
      setFetchErr('')
      setTitle('')
      setChannel('')
      setThumb('')
      setYoutubeId('')
    }
  }

  // ── Tag management ────────────────────────────────────────────────────────
  const commitTags = (raw) => {
    parseTags(raw).forEach(tag => {
      setTags(prev => prev.includes(tag) ? prev : [...prev, tag])
    })
  }

  const onTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitTags(tagInput)
      setTagInput('')
    }
    if (e.key === 'Backspace' && !tagInput && tags.length) {
      setTags(prev => prev.slice(0, -1))
    }
  }

  const onTagBlur = () => {
    if (tagInput.trim()) { commitTags(tagInput); setTagInput('') }
  }

  // ── Save to Supabase ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    setSaveError('')

    const payload = {
      user_id:      session?.user?.id,
      title:        title.trim(),
      channel:      channel.trim()  || null,
      thumbnail_url: thumbnailUrl   || null,
      youtube_id:   youtubeId       || null,
      url:          url.trim()      || null,
      domain:       domain.trim()   || null,
      tags:         tags.length     ? tags : null,
      notes:        notes.trim()    || null,
      watch_status: 'unwatched',
      saved_for_later: false,
    }

    const { error } = await supabase.from('videos').insert(payload)

    if (error) {
      if (error.message?.includes('FREE_LIMIT_REACHED')) {
        setUpgrade(true)
      } else {
        setSaveError(error.message)
      }
      setSaving(false)
      return
    }

    triggerRefresh()
    onClose()
  }

  // ── UpgradeModal short-circuit ─────────────────────────────────────────────
  if (showUpgrade) {
    return <UpgradeModal onClose={() => { setUpgrade(false); onClose() }} />
  }

  const canSave = title.trim().length > 0 && !saving

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                 bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 w-full sm:max-w-lg
                      rounded-t-3xl sm:rounded-2xl shadow-2xl
                      max-h-[92dvh] flex flex-col">

        {/* ── Modal header ── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4
                        border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {t.addVideoTitle}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100
                       dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* URL + Fetch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.youtubeUrl}
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={e => handleUrlChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFetch()}
                placeholder={t.urlPlaceholder}
                className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-gray-200
                           dark:border-gray-600 bg-gray-50 dark:bg-gray-700
                           text-gray-900 dark:text-white placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-primary-500
                           focus:border-transparent transition-all text-sm"
              />
              <button
                onClick={handleFetch}
                disabled={!url.trim() || fetchState === 'loading'}
                className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700
                           disabled:bg-gray-200 dark:disabled:bg-gray-600
                           text-white disabled:text-gray-400
                           rounded-xl text-sm font-semibold transition-colors
                           whitespace-nowrap flex items-center gap-2 shrink-0"
              >
                {fetchState === 'loading' ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                )}
                {t.fetchBtn}
              </button>
            </div>

            {/* Fetch error */}
            {fetchState === 'error' && fetchError && (
              <div className="mt-2 flex items-start gap-2 text-xs text-amber-700
                              dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20
                              px-3 py-2 rounded-lg">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <span>{fetchError} — {t.manualEntryHint}</span>
              </div>
            )}

            {/* Success preview */}
            {fetchState === 'done' && (title || thumbnailUrl) && (
              <div className="mt-3 flex gap-3 items-center p-3
                              bg-emerald-50 dark:bg-emerald-900/20 rounded-xl
                              border border-emerald-100 dark:border-emerald-900/40">
                <ThumbPreview src={thumbnailUrl} title={title} youtubeId={youtubeId}/>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 leading-snug">
                    {title}
                  </p>
                  {channel && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {channel}
                    </p>
                  )}
                </div>
                <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"/>
                </svg>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.videoTitleLabel}
              <span className="text-red-500 ms-0.5">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t.videoTitlePlaceholder}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                         bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                         placeholder-gray-400 focus:outline-none focus:ring-2
                         focus:ring-primary-500 focus:border-transparent transition-all text-sm"
            />
          </div>

          {/* Channel */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.channelLabel}
            </label>
            <input
              type="text"
              value={channel}
              onChange={e => setChannel(e.target.value)}
              placeholder={t.channelPlaceholder}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                         bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                         placeholder-gray-400 focus:outline-none focus:ring-2
                         focus:ring-primary-500 focus:border-transparent transition-all text-sm"
            />
          </div>

          {/* Domain */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.domainLabel}
            </label>
            <input
              list="domain-list"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder={t.domainPlaceholder}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                         bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                         placeholder-gray-400 focus:outline-none focus:ring-2
                         focus:ring-primary-500 focus:border-transparent transition-all text-sm"
            />
            {preferredDomains.length > 0 && (
              <datalist id="domain-list">
                {preferredDomains.map(d => <option key={d} value={d}/>)}
              </datalist>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.tagsLabel}
            </label>
            {/* Tag chips */}
            <div className={`
              flex flex-wrap gap-1.5 px-3 py-2.5 rounded-xl border transition-all
              bg-gray-50 dark:bg-gray-700
              border-gray-200 dark:border-gray-600
              focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent
              ${tags.length > 0 ? 'pb-2' : ''}
            `}>
              {tags.map(tag => (
                <span key={tag}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full
                             bg-primary-100 dark:bg-primary-900/50
                             text-primary-700 dark:text-primary-300">
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                    className="hover:text-red-500 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={onTagKeyDown}
                onBlur={onTagBlur}
                placeholder={tags.length === 0 ? t.tagsPlaceholder : ''}
                className="flex-1 min-w-[120px] bg-transparent text-sm text-gray-900
                           dark:text-white placeholder-gray-400 outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.notesLabel}
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t.notesPlaceholder}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                         bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                         placeholder-gray-400 focus:outline-none focus:ring-2
                         focus:ring-primary-500 focus:border-transparent transition-all
                         text-sm resize-none"
            />
          </div>

          {/* Save error */}
          {saveError && (
            <p className="text-sm text-red-600 dark:text-red-400
                          bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {saveError}
            </p>
          )}
        </div>

        {/* ── Footer actions ── */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700
                        flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-200 dark:border-gray-600
                       text-gray-600 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-700
                       rounded-xl font-medium transition-colors text-sm"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 py-3 bg-primary-600 hover:bg-primary-700
                       disabled:bg-gray-200 dark:disabled:bg-gray-600
                       text-white disabled:text-gray-400
                       rounded-xl font-semibold transition-colors text-sm
                       flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {t.saving}
              </>
            ) : t.save}
          </button>
        </div>

      </div>
    </div>
  )
}

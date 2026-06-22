import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { useLibrary } from '../context/LibraryContext'
import UpgradeModal from './UpgradeModal'

// ── Normalization ─────────────────────────────────────────────────────────────
function normTag(s) { return s.trim().toLowerCase() }

function parseTags(raw) {
  return [...new Set(raw.split(',').map(normTag).filter(Boolean))]
}

function normalizeTags(arr) {
  return [...new Set(arr.map(normTag).filter(Boolean))]
}

// ── Extract youtube_id from any YouTube URL format ────────────────────────────
function extractYoutubeId(url) {
  if (!url) return null
  const patterns = [
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

// ── Autosuggest dropdown ──────────────────────────────────────────────────────
function SuggestDropdown({ options, onSelect }) {
  if (!options.length) return null
  return (
    <div
      className="absolute z-30 top-full start-0 end-0 mt-1 rounded-xl
                 overflow-hidden overflow-y-auto max-h-44"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => onSelect(opt)}
          className="w-full text-start px-3 py-2 text-sm text-[var(--ink)]
                     hover:bg-[var(--accent-tint)] hover:text-[var(--accent)]
                     transition-colors"
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

// ── Thumbnail preview ─────────────────────────────────────────────────────────
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
// video prop = null → add mode; video prop = object → edit mode
export default function AddVideoModal({ onClose, video: initialVideo = null }) {
  const { session } = useAuth()
  const { t } = useLang()
  const { triggerRefresh } = useLibrary()

  const isEditMode = !!initialVideo

  // URL + fetch
  const [url, setUrl]           = useState(initialVideo?.url ?? '')
  const [fetchState, setFS]     = useState(
    isEditMode && (initialVideo?.title || initialVideo?.thumbnail_url) ? 'done' : 'idle'
  )
  const [fetchError, setFetchErr] = useState('')

  // Video fields — pre-fill in edit mode
  const [title, setTitle]       = useState(initialVideo?.title ?? '')
  const [channel, setChannel]   = useState(initialVideo?.channel ?? '')
  const [thumbnailUrl, setThumb] = useState(initialVideo?.thumbnail_url ?? '')
  const [youtubeId, setYoutubeId] = useState(initialVideo?.youtube_id ?? '')

  // Categorization
  const [domain, setDomain]     = useState(initialVideo?.domain ?? '')
  const [showDomainSuggest, setShowDomainSuggest] = useState(false)
  const [tags, setTags]         = useState(
    Array.isArray(initialVideo?.tags) ? initialVideo.tags : []
  )
  const [tagInput, setTagInput] = useState('')

  // Intent + notes (notes not edited here per spec; intent is)
  const [intent, setIntent]     = useState(initialVideo?.intent ?? '')

  // Existing tags/domains for autosuggest
  const [allTags, setAllTags]   = useState([])
  const [allDomains, setAllDomains] = useState([])

  // Save
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showUpgrade, setUpgrade] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  // Load user's existing tags + domains for autosuggest
  useEffect(() => {
    const uid = session?.user?.id
    if (!uid) return
    supabase.from('videos').select('tags, domain').eq('user_id', uid).then(({ data }) => {
      if (!data) return
      const tagSet = new Set()
      const domSet = new Set()
      data.forEach(v => {
        ;(Array.isArray(v.tags) ? v.tags : []).forEach(tg => { if (tg) tagSet.add(tg.trim().toLowerCase()) })
        if (v.domain) domSet.add(v.domain.trim().toLowerCase())
      })
      setAllTags([...tagSet].sort())
      setAllDomains([...domSet].sort())
    })
  }, [session?.user?.id])

  // ── Fetch oEmbed ──────────────────────────────────────────────────────────
  const handleFetch = async () => {
    const raw = url.trim()
    if (!raw) return
    setFS('loading')
    setFetchErr('')
    try {
      const { data, error } = await supabase.functions.invoke('oembed', { body: { url: raw } })
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
    if (fieldErrors.url) setFieldErrors(e => ({ ...e, url: false }))
    if (!val.trim() && !isEditMode) {
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

  const tagSuggestions = tagInput.trim()
    ? allTags.filter(tg => tg.includes(tagInput.trim().toLowerCase()) && !tags.includes(tg))
    : []

  const domainSuggestions = domain.trim()
    ? allDomains.filter(d => d.includes(domain.trim().toLowerCase()) && d !== domain.trim().toLowerCase())
    : []

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (saving) return
    const errs = {}
    if (!url.trim())   errs.url   = true
    if (!title.trim()) errs.title = true
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setFieldErrors({})
    setSaving(true)
    setSaveError('')

    const finalTags = normalizeTags(tags)
    const finalUrl  = url.trim()

    if (isEditMode) {
      // Derive youtube_id from updated URL; fall back to current
      const derivedId = extractYoutubeId(finalUrl) || youtubeId || null
      // Update thumbnail only when the ID changed
      const derivedThumb = (derivedId && derivedId !== initialVideo.youtube_id)
        ? `https://img.youtube.com/vi/${derivedId}/mqdefault.jpg`
        : thumbnailUrl || null

      const { error } = await supabase.from('videos')
        .update({
          title:         title.trim(),
          channel:       channel.trim() || null,
          url:           finalUrl       || null,
          domain:        domain.trim().toLowerCase() || null,
          tags:          finalTags.length ? finalTags : null,
          intent:        intent.trim()   || null,
          youtube_id:    derivedId,
          thumbnail_url: derivedThumb,
        })
        .eq('id', initialVideo.id)
        .eq('user_id', session.user.id)

      if (error) { setSaveError(error.message); setSaving(false); return }
      triggerRefresh()
      onClose()
    } else {
      // Add mode
      const payload = {
        user_id:         session?.user?.id,
        title:           title.trim(),
        channel:         channel.trim()  || null,
        thumbnail_url:   thumbnailUrl    || null,
        youtube_id:      youtubeId       || null,
        url:             finalUrl        || null,
        domain:          domain.trim().toLowerCase() || null,
        tags:            finalTags.length ? finalTags : null,
        intent:          intent.trim()   || null,
        notes:           null,
        watch_status:    'unwatched',
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
  }

  if (showUpgrade) {
    return <UpgradeModal onClose={() => { setUpgrade(false); onClose() }} />
  }

  const hasFieldErrors = fieldErrors.url || fieldErrors.title

  const inputCls = `w-full px-4 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-700
    text-gray-900 dark:text-white placeholder-gray-400
    focus:outline-none focus:ring-2 focus:border-transparent transition-all text-sm
    border-gray-200 dark:border-gray-600 focus:ring-primary-500`

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                 bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 w-full sm:max-w-lg
                      rounded-t-3xl sm:rounded-2xl shadow-2xl
                      max-h-[92dvh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4
                        border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEditMode ? t.editVideoTitle : t.addVideoTitle}
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
              <span className="text-red-500 ms-0.5">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={e => handleUrlChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFetch()}
                placeholder={t.urlPlaceholder}
                className={`flex-1 min-w-0 px-4 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-700
                           text-gray-900 dark:text-white placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:border-transparent transition-all text-sm
                           ${fieldErrors.url
                             ? 'border-red-500 focus:ring-red-500'
                             : 'border-gray-200 dark:border-gray-600 focus:ring-primary-500'}`}
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

            {/* Thumbnail preview — shown in both add (after fetch) and edit (pre-filled) */}
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{channel}</p>
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
              onChange={e => {
                setTitle(e.target.value)
                if (fieldErrors.title) setFieldErrors(err => ({ ...err, title: false }))
              }}
              placeholder={t.videoTitlePlaceholder}
              className={`w-full px-4 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-700
                         text-gray-900 dark:text-white placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:border-transparent transition-all text-sm
                         ${fieldErrors.title
                           ? 'border-red-500 focus:ring-red-500'
                           : 'border-gray-200 dark:border-gray-600 focus:ring-primary-500'}`}
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
              className={inputCls}
            />
          </div>

          {/* Domain + autosuggest */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.domainLabel}
            </label>
            <div className="relative">
              <input
                type="text"
                value={domain}
                onChange={e => { setDomain(e.target.value); setShowDomainSuggest(true) }}
                onFocus={() => setShowDomainSuggest(true)}
                onBlur={() => setShowDomainSuggest(false)}
                placeholder={t.domainPlaceholder}
                className={inputCls}
              />
              {showDomainSuggest && (
                <SuggestDropdown
                  options={domainSuggestions}
                  onSelect={d => { setDomain(d); setShowDomainSuggest(false) }}
                />
              )}
            </div>
          </div>

          {/* Tags + autosuggest */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.tagsLabel}
            </label>
            <div className="relative">
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
              <SuggestDropdown
                options={tagSuggestions}
                onSelect={tag => {
                  setTags(prev => prev.includes(tag) ? prev : [...prev, tag])
                  setTagInput('')
                }}
              />
            </div>
          </div>

          {/* Intent */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.intentLabel}
            </label>
            <input
              type="text"
              value={intent}
              onChange={e => setIntent(e.target.value)}
              placeholder={t.intentPlaceholder}
              className={inputCls}
            />
          </div>

          {hasFieldErrors && (
            <p className="text-sm text-red-600 dark:text-red-400
                          bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {t.requiredFieldsError}
            </p>
          )}

          {saveError && (
            <p className="text-sm text-red-600 dark:text-red-400
                          bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {saveError}
            </p>
          )}
        </div>

        {/* ── Footer ── */}
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
            disabled={saving}
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
            ) : isEditMode ? t.saveChanges : t.save}
          </button>
        </div>

      </div>
    </div>
  )
}

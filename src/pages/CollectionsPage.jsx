import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import VideoPlayerModal from '../components/VideoPlayerModal'
import LuminaverseIcon from '../components/LuminaverseIcon'

// ── Constants ─────────────────────────────────────────────────────────────────
const EMOJI_PRESETS = ['📚', '🎯', '💡', '🔥', '⭐', '🎬', '🚀', '🎓', '💻', '🎨', '🏆', '🔖']

const CONFETTI = [
  { color: '#1D9E75', w: 8,  h: 5,  top: 12, left: 18, delay: 0 },
  { color: '#4ADE80', w: 6,  h: 6,  top: 8,  left: 75, delay: 0.08 },
  { color: '#E1F5EE', w: 10, h: 4,  top: 20, left: 50, delay: 0.04 },
  { color: '#86EFAC', w: 5,  h: 8,  top: 5,  left: 35, delay: 0.12 },
  { color: '#1D9E75', w: 7,  h: 5,  top: 15, left: 85, delay: 0.06 },
  { color: '#6EE7B7', w: 6,  h: 6,  top: 10, left: 62, delay: 0.10 },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function toArr(raw) { return Array.isArray(raw) ? raw : [] }

function relativeTime(dateStr, t) {
  if (!dateStr) return ''
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days === 0) return t.completedToday
  if (days === 1) return t.completedYesterday
  return (t.completedNDaysAgo ?? '').replace('{n}', days)
}

function extractNotes(video) {
  const learning = (video.learning && typeof video.learning === 'object') ? video.learning : {}
  const result = []
  if (typeof learning.takeaways === 'string' && learning.takeaways.trim())
    result.push({ text: learning.takeaways.trim(), videoTitle: video.title, videoId: video.id, video })
  if (typeof video.notes === 'string' && video.notes.trim())
    result.push({ text: video.notes.trim(), videoTitle: video.title, videoId: video.id, video })
  return result
}

function calcProgress(videos) {
  const total     = videos.length
  const completed = videos.filter(v => !!v.completed_at).length
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0
  return { total, completed, pct }
}

// Fully-pluralized stats string for celebration modal and completed banner
function buildCelebStats({ n, notes, completedTs }, lang) {
  // Videos
  let vidPart
  if (lang === 'ar') {
    vidPart = n === 1 ? 'فيديو واحد' : `${n} فيديوهات`
  } else {
    vidPart = `${n} ${n === 1 ? 'video' : 'videos'}`
  }

  // Notes
  let notesPart
  if (lang === 'ar') {
    notesPart = notes === 1 ? 'ملاحظة واحدة' : `${notes} ملاحظات`
  } else {
    notesPart = `${notes} ${notes === 1 ? 'note' : 'notes'}`
  }

  // Days — guard against "0 days" and "same-day" case
  let daysPart
  const isSameDay = completedTs.length <= 1 ||
    (Math.max(...completedTs) - Math.min(...completedTs)) < 86400000
  if (isSameDay) {
    const isToday = completedTs.length > 0 &&
      new Date(Math.max(...completedTs)).toDateString() === new Date().toDateString()
    if (lang === 'ar') {
      daysPart = isToday ? 'أنجزتها اليوم' : 'في يوم واحد'
    } else {
      daysPart = isToday ? 'today' : 'in one day'
    }
  } else {
    const days = Math.ceil((Math.max(...completedTs) - Math.min(...completedTs)) / 86400000)
    if (lang === 'ar') {
      daysPart = `في ${days} ${days === 1 ? 'يوم' : 'أيام'}`
    } else {
      daysPart = `in ${days} ${days === 1 ? 'day' : 'days'}`
    }
  }

  return `${vidPart} · ${notesPart} · ${daysPart}`
}

function videoMetaStr(n, lang, t) {
  if (lang === 'ar') return (t.videosMeta ?? '').replace('{n}', n)
  return `${n} ${n === 1 ? 'video' : 'videos'}`
}

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

// ── TagInput ──────────────────────────────────────────────────────────────────
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

// ── ChecklistRow ──────────────────────────────────────────────────────────────
function ChecklistRow({ video, idx, isNextUp, onToggle, onRemove, onPlay, t }) {
  const [confirmRm, setConfirmRm] = useState(false)
  const completed  = !!video.completed_at
  const notesCount = extractNotes(video).length

  return (
    <div
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
      style={isNextUp ? { background: 'var(--accent-tint)' } : undefined}
    >
      {/* Completion circle */}
      <button
        type="button"
        onClick={() => onToggle(video)}
        title={completed ? t.markUncomplete : t.markComplete}
        className="shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
                   transition-all motion-safe:hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-400"
        style={{
          borderColor: completed ? '#1D9E75' : 'var(--border)',
          background:  completed ? '#1D9E75' : 'transparent',
        }}
      >
        {completed && (
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
          </svg>
        )}
      </button>

      {/* Thumbnail */}
      <button
        type="button"
        onClick={onPlay}
        className="shrink-0 w-16 h-9 rounded-lg overflow-hidden relative focus:outline-none"
      >
        <MiniThumb src={video.thumbnail_url} title={video.title} youtubeId={video.youtube_id} />
        {isNextUp && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
              <svg className="w-2.5 h-2.5 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
        )}
      </button>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <button type="button" onClick={onPlay} className="text-start w-full group/title">
          <p
            className={`text-sm font-medium leading-snug transition-colors ${
              completed ? '' : 'group-hover/title:text-[var(--accent)]'
            }`}
            style={{
              color: completed ? 'var(--muted)' : 'var(--ink)',
              textDecoration: completed ? 'line-through' : 'none',
            }}
          >
            {video.title || '—'}
          </p>
        </button>
        {completed && video.completed_at && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {relativeTime(video.completed_at, t)}
          </p>
        )}
        {!completed && isNextUp && (
          <span
            className="inline-flex items-center gap-0.5 text-[11px] font-semibold mt-0.5"
            style={{ color: '#1D9E75' }}
          >
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            {t.nextUp}
          </span>
        )}
      </div>

      {/* End: notes badge + position + remove */}
      <div className="shrink-0 ms-auto flex items-center gap-2">
        {confirmRm ? (
          <>
            <button
              onClick={() => { onRemove(); setConfirmRm(false) }}
              className="text-[11px] bg-red-600 hover:bg-red-700 text-white
                         px-2 py-0.5 rounded font-medium transition-colors"
            >
              {t.confirmDelete}
            </button>
            <button
              onClick={() => setConfirmRm(false)}
              className="text-[11px] text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
            >
              {t.cancel}
            </button>
          </>
        ) : (
          <>
            {/* Notes count — hidden when 0 */}
            {notesCount > 0 && (
              <span
                title={t.notesTooltip}
                className="flex items-center gap-0.5 text-xs tabular-nums"
                style={{ color: 'var(--muted)' }}
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5
                       m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
                {notesCount}
              </span>
            )}
            <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
              {video.position ?? idx + 1}
            </span>
            <button
              onClick={() => setConfirmRm(true)}
              title={t.removeFromCollection}
              className="opacity-0 group-hover:opacity-40 hover:!opacity-100
                         p-1 rounded transition-all
                         hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              style={{ color: 'var(--muted)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── JourneyNotes ──────────────────────────────────────────────────────────────
function JourneyNotes({ notes, onOpenVideo, t }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-bold" style={{ color: 'var(--ink)' }}>{t.journeyNotes}</h2>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--accent-tint)', color: 'var(--accent)' }}
        >
          {notes.length}
        </span>
      </div>
      {notes.length === 0 ? (
        <div className="py-8 text-center rounded-2xl border border-dashed border-[var(--border)]">
          <div className="text-3xl mb-2">📝</div>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{t.noJourneyNotes}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note, i) => (
            <div
              key={`${note.videoId}-${i}`}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (window.getSelection()?.toString()) return
                onOpenVideo(note.video)
              }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenVideo(note.video) } }}
              className="rounded-xl px-4 py-3 cursor-pointer transition-all"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-card)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-tint)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--card)' }}
            >
              <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>{note.text}</p>
              {/* Source link */}
              <p
                className="text-xs mt-2 inline-flex items-center gap-1 hover:underline"
                style={{ color: '#1D9E75' }}
              >
                <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                {t.noteSource}{note.videoTitle}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── CompletedBanner ───────────────────────────────────────────────────────────
function CompletedBanner({ collectionName, stats, lang, t }) {
  const statsStr = buildCelebStats(stats, lang)
  return (
    <div
      className="rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{ background: 'var(--accent-tint)', border: '1px solid var(--accent-soft)' }}
    >
      <div className="text-2xl shrink-0">🎓</div>
      <div className="min-w-0">
        <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
          {t.completedBannerTitle}
          {collectionName && <> — <bdi className="font-bold">{collectionName}</bdi></>}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{statsStr}</p>
      </div>
    </div>
  )
}

// ── CelebrationModal ──────────────────────────────────────────────────────────
function CelebrationModal({ collectionName, stats, lang, t, onDismiss }) {
  // Split template at {title} so we can wrap with <bdi>
  const titleTemplate = t.celebTitle ?? ''
  const [titleBefore, titleAfter] = titleTemplate.includes('{title}')
    ? titleTemplate.split('{title}')
    : [titleTemplate, '']
  const statsStr = buildCelebStats(stats, lang)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <style>{`
        @keyframes lvCelebrateIn {
          from { transform: scale(0.82) translateY(16px); opacity: 0; }
          to   { transform: scale(1)    translateY(0);    opacity: 1; }
        }
        @keyframes lvConfettiFloat {
          from { transform: translateY(0)    rotate(0deg);   opacity: 1; }
          to   { transform: translateY(-56px) rotate(200deg); opacity: 0; }
        }
        @media (prefers-reduced-motion: no-preference) {
          .lv-celebrate-in   { animation: lvCelebrateIn   0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
          .lv-confetti-piece { animation: lvConfettiFloat 0.9s ease-out both; }
        }
      `}</style>

      <div
        className="lv-celebrate-in relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl
                   max-w-sm w-full p-7 text-center overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Confetti */}
        {CONFETTI.map((c, i) => (
          <div
            key={i}
            className="lv-confetti-piece absolute pointer-events-none rounded-sm"
            style={{
              width: c.w, height: c.h,
              top: `${c.top}%`, left: `${c.left}%`,
              background: c.color,
              animationDelay: `${c.delay}s`,
            }}
          />
        ))}

        <div className="text-5xl mb-3">🎓</div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {titleBefore}<bdi>{collectionName}</bdi>{titleAfter}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{statsStr}</p>

        <div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold mb-6"
          style={{ background: 'var(--accent-tint)', color: 'var(--accent)' }}
        >
          {t.celebBadge}
        </div>

        <button
          onClick={onDismiss}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white
                     bg-primary-600 hover:bg-primary-700 active:bg-primary-800 transition-colors"
        >
          {t.celebDismiss}
        </button>
      </div>
    </div>
  )
}

// ── CollectionFormModal ───────────────────────────────────────────────────────
function CollectionFormModal({ heading, initial, onSubmit, onClose, t, showTags }) {
  const [name, setName]     = useState(initial?.name ?? '')
  const [icon, setIcon]     = useState(initial?.icon ?? '')
  const [tags, setTags]     = useState(toArr(initial?.tags))
  const [tagsRevealed, setTagsRevealed] = useState(() => toArr(initial?.tags).length > 0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSaving(true); setSaveError('')
    try {
      await onSubmit({ name: name.trim(), icon: icon.trim(), tags })
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
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{heading}</h2>
          <button onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.collectionIcon}</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {EMOJI_PRESETS.map(e => (
                <button key={e} onClick={() => setIcon(icon === e ? '' : e)}
                  className={`text-xl w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                    icon === e
                      ? 'bg-primary-100 dark:bg-primary-900/40 ring-2 ring-primary-500'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}>
                  {e}
                </button>
              ))}
            </div>
            <input type="text" value={icon} onChange={e => setIcon(e.target.value)}
              placeholder={t.collectionIconPlaceholder}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600
                         bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t.collectionName}<span className="text-red-500 ms-0.5">*</span>
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder={t.collectionNamePlaceholder}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600
                         bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary-500"/>
          </div>

          {!showTags && !tagsRevealed && (
            <button type="button" onClick={() => setTagsRevealed(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium self-start
                         px-2.5 py-1 rounded-lg text-[#1D9E75] dark:text-[#2ec58d]
                         border border-[#1D9E75]/25 hover:bg-[#1D9E75]/10 transition-colors">
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

        {saveError && (
          <div className="mx-6 mb-2 px-3 py-2 rounded-xl text-sm text-red-600 dark:text-red-400
                          bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30">
            {saveError}
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-sm
                       text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            {t.cancel}
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-colors
                       bg-primary-600 hover:bg-primary-700 text-white
                       disabled:opacity-60 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2">
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
      const { data } = await supabase.from('videos')
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
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  const handleAdd = async () => {
    if (selected.size === 0) return
    setSaving(true); setAddError('')
    try { await onAdd([...selected]); onClose() }
    catch (err) { setAddError(err.message ?? t.errGeneric); setSaving(false) }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[80dvh] flex flex-col">
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

        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="relative">
            <div className="absolute inset-y-0 start-3 flex items-center pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full ps-9 pe-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600
                         bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white
                         placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"/>
          </div>
        </div>

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
                <label key={video.id}
                  className="flex items-center gap-3 px-4 py-3
                             hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                  <input type="checkbox" checked={selected.has(video.id)} onChange={() => toggle(video.id)}
                    className="w-4 h-4 rounded text-primary-600 border-gray-300 dark:border-gray-600 focus:ring-primary-500"/>
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

        {addError && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-xl text-sm text-red-600 dark:text-red-400
                          bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 shrink-0">
            {addError}
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex gap-3 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-3 border border-gray-200 dark:border-gray-600 rounded-xl font-medium text-sm
                       text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            {t.cancel}
          </button>
          <button onClick={handleAdd} disabled={selected.size === 0 || saving}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-colors
                       bg-primary-600 hover:bg-primary-700 text-white
                       disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400
                       flex items-center justify-center gap-2">
            {saving && <Spinner size="w-4 h-4" />}
            {t.addSelected}{selected.size > 0 ? ` (${selected.size})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CollectionsPage() {
  const { session, showTags } = useAuth()
  const { t, lang }           = useLang()
  const uid = session?.user?.id

  const [collections, setCollections]   = useState([])
  const [videoCounts, setVideoCounts]   = useState({})
  const [completedCounts, setCompletedCounts] = useState({})
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

  const [showCelebration, setShowCelebration]       = useState(false)
  const [showCompletedBanner, setShowCompletedBanner] = useState(false)

  // ── Load collections + sidebar counts ──────────────────────────────────────
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
          .select('collection_id, completed_at')
          .in('collection_id', list.map(c => c.id))
        const totals = {}
        const dones  = {}
        ;(cv ?? []).forEach(r => {
          totals[r.collection_id] = (totals[r.collection_id] ?? 0) + 1
          if (r.completed_at) dones[r.collection_id] = (dones[r.collection_id] ?? 0) + 1
        })
        setVideoCounts(totals)
        setCompletedCounts(dones)
      }
    } finally {
      setColsLoading(false)
    }
  }, [uid])

  useEffect(() => { loadCollections() }, [loadCollections])

  // ── Load detail: position + completed_at from CV, learning + notes from videos ─
  const loadColVideos = useCallback(async (colId) => {
    if (!colId || !uid) return
    setCvLoading(true)
    setCvError('')
    try {
      const { data: cvRows, error: cvErr } = await supabase
        .from('collection_videos')
        .select('video_id, position, completed_at')
        .eq('collection_id', colId)
        .order('position', { ascending: true })
      if (cvErr) throw new Error(cvErr.message)

      const videoIds = (cvRows ?? []).map(r => r.video_id).filter(Boolean)
      if (videoIds.length === 0) {
        setColVideos([])
        setVideoCounts(prev => ({ ...prev, [colId]: 0 }))
        setShowCompletedBanner(false)
        return
      }

      const { data: videos, error: vErr } = await supabase
        .from('videos')
        .select('id, title, channel, thumbnail_url, youtube_id, watch_status, learning, notes')
        .in('id', videoIds)
        .eq('user_id', uid)
      if (vErr) throw new Error(vErr.message)

      const videoMap = {}
      ;(videos ?? []).forEach(v => { videoMap[v.id] = v })

      const merged = (cvRows ?? [])
        .map(r => {
          const v = videoMap[r.video_id]
          return v ? { ...v, position: r.position, completed_at: r.completed_at } : null
        })
        .filter(Boolean)

      setColVideos(merged)
      setVideoCounts(prev => ({ ...prev, [colId]: merged.length }))

      const allDone = merged.length > 0 && merged.every(v => !!v.completed_at)
      setShowCompletedBanner(allDone)
    } catch (err) {
      console.error('[Collections] load failed:', err)
      setCvError(err.message)
    } finally {
      setCvLoading(false)
    }
  }, [uid])

  useEffect(() => {
    if (selectedId) loadColVideos(selectedId)
    else { setColVideos([]); setShowCompletedBanner(false) }
  }, [selectedId, loadColVideos])

  const selectedCol = collections.find(c => c.id === selectedId) ?? null

  // ── Derived state ───────────────────────────────────────────────────────────
  const progress = useMemo(() => calcProgress(colVideos), [colVideos])

  const nextUpVideo = useMemo(() =>
    colVideos.find(v => !v.completed_at) ?? null
  , [colVideos])

  const allNotes = useMemo(() => colVideos.flatMap(v => extractNotes(v)), [colVideos])

  const celebrationStats = useMemo(() => {
    const n     = colVideos.length
    const notes = allNotes.length
    const completedTs = colVideos
      .filter(v => !!v.completed_at)
      .map(v => new Date(v.completed_at).getTime())
    return { n, notes, completedTs }
  }, [colVideos, allNotes])

  const createdDate = selectedCol?.created_at
    ? new Date(selectedCol.created_at).toLocaleDateString(
        lang === 'ar' ? 'ar-SA' : 'en-US',
        { year: 'numeric', month: 'short' }
      )
    : ''

  // ── Toggle completion (collection_videos.completed_at) ──────────────────────
  const handleToggleCompletion = async (video) => {
    const wasCompleted   = !!video.completed_at
    const newCompletedAt = wasCompleted ? null : new Date().toISOString()

    const newVideos = colVideos.map(v =>
      v.id === video.id ? { ...v, completed_at: newCompletedAt } : v
    )
    setColVideos(newVideos)

    const delta = wasCompleted ? -1 : 1
    setCompletedCounts(prev => ({
      ...prev,
      [selectedId]: Math.max(0, (prev[selectedId] ?? 0) + delta),
    }))

    const { error } = await supabase
      .from('collection_videos')
      .update({ completed_at: newCompletedAt })
      .eq('collection_id', selectedId)
      .eq('video_id', video.id)

    if (error) {
      setColVideos(colVideos)
      setCompletedCounts(prev => ({
        ...prev,
        [selectedId]: Math.max(0, (prev[selectedId] ?? 0) - delta),
      }))
      setCvError(error.message)
      console.error('[Collections] toggle completion failed:', error)
      return
    }

    if (!wasCompleted) {
      // Silently mark watched in library if not already (one-directional, fire-and-forget)
      if (video.watch_status !== 'watched') {
        supabase.from('videos')
          .update({ watch_status: 'watched' })
          .eq('id', video.id)
          .eq('user_id', uid)
          .then(({ error: we }) => {
            if (we) console.warn('[Collections] watch sync failed:', we.message)
          })
      }

      // Celebration: only when 2+ videos and all now complete
      const newCompleted = newVideos.filter(v => !!v.completed_at).length
      const newTotal     = newVideos.length
      if (newCompleted === newTotal && newTotal >= 2) {
        setShowCelebration(true)
        setShowCompletedBanner(false)
      } else if (newCompleted === newTotal && newTotal === 1) {
        // Single-video collection: banner only, no celebration
        setShowCompletedBanner(true)
        setShowCelebration(false)
      }
    } else {
      // Un-completing clears both
      setShowCelebration(false)
      setShowCompletedBanner(false)
    }
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const handleCreate = async ({ name, icon, tags }) => {
    const { data, error } = await supabase
      .from('collections')
      .insert({ user_id: uid, name, icon: icon || null, tags: tags ?? [] })
      .select('id, name, icon, tags, created_at')
      .single()
    if (error) throw new Error(error.message)
    setCollections(prev => [...prev, data])
    setVideoCounts(prev => ({ ...prev, [data.id]: 0 }))
    setSelectedId(data.id)
    setShowCreate(false)
  }

  const handleEdit = async ({ name, icon, tags }) => {
    if (!editTarget) return
    const { data, error } = await supabase
      .from('collections')
      .update({ name, icon: icon || null, tags: tags ?? [] })
      .eq('id', editTarget.id).eq('user_id', uid)
      .select('id, name, icon, tags, created_at')
      .single()
    if (error) throw new Error(error.message)
    setCollections(prev => prev.map(c => c.id === data.id ? data : c))
    setEditTarget(null)
  }

  const handleDelete = async () => {
    if (!selectedId) return
    await supabase.from('collection_videos').delete().eq('collection_id', selectedId)
    await supabase.from('collections').delete().eq('id', selectedId).eq('user_id', uid)
    setCollections(prev => prev.filter(c => c.id !== selectedId))
    setVideoCounts(prev => { const n = { ...prev }; delete n[selectedId]; return n })
    setCompletedCounts(prev => { const n = { ...prev }; delete n[selectedId]; return n })
    setSelectedId(null)
    setColVideos([])
    setConfirmDel(false)
  }

  const handleRemoveVideo = async (videoId) => {
    const removing = colVideos.find(v => v.id === videoId)
    await supabase.from('collection_videos').delete()
      .eq('collection_id', selectedId).eq('video_id', videoId)
    const next = colVideos.filter(v => v.id !== videoId)
    setColVideos(next)
    setVideoCounts(prev => ({ ...prev, [selectedId]: next.length }))
    if (removing?.completed_at) {
      setCompletedCounts(prev => ({
        ...prev,
        [selectedId]: Math.max(0, (prev[selectedId] ?? 0) - 1),
      }))
    }
  }

  const handleAddVideos = async (videoIds) => {
    const rows = videoIds.map(vid => ({ collection_id: selectedId, video_id: vid }))
    const { error } = await supabase.from('collection_videos').insert(rows)
    if (error) throw new Error(error.message)
    await loadColVideos(selectedId)
  }

  const handleSelectCol = (id) => {
    setSelectedId(id)
    setConfirmDel(false)
    setShowCelebration(false)
    setShowCompletedBanner(false)
    setCvError('')
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100dvh-4rem)]">

      {/* ── Sidebar ── */}
      <aside
        className="w-full md:w-72 shrink-0 flex flex-col bg-[var(--card)] border-b md:border-b-0"
        style={{ borderInlineEnd: '1px solid var(--border)' }}
      >
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
            const active  = selectedId === col.id
            const total   = videoCounts[col.id]   ?? 0
            const done    = completedCounts[col.id] ?? 0
            const minPct  = total > 0 ? Math.round((done / total) * 100) : 0
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

                {/* Mini progress — hidden for empty collections */}
                {total > 0 && (
                  <div className="shrink-0 flex flex-col items-end gap-0.5">
                    <span className={`text-xs tabular-nums font-medium ${
                      active ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
                    }`}>
                      {done}/{total}
                    </span>
                    <div
                      className="w-12 h-1.5 rounded-full overflow-hidden"
                      style={{ background: 'var(--accent-tint)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${minPct}%`, background: '#1D9E75' }}
                      />
                    </div>
                  </div>
                )}
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
          <div className="p-6 space-y-6 max-w-3xl">

            {/* ── Collection header ── */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'linear-gradient(135deg, var(--accent-tint) 0%, var(--card) 70%)',
                border: '1px solid var(--accent-soft)',
              }}
            >
              {/* Title row + edit/delete */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-4xl shrink-0">{selectedCol.icon || '📁'}</span>
                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold truncate" style={{ color: 'var(--ink)' }}>
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
                      <button onClick={handleDelete}
                        className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors">
                        {t.confirmDelete}
                      </button>
                      <button onClick={() => setConfirmDel(false)}
                        className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-600
                                   text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        {t.cancel}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDel(true)} title={t.deleteCollection}
                      className="p-2 rounded-lg text-gray-500
                                 hover:bg-red-50 dark:hover:bg-red-900/20
                                 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7
                             m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Meta + pill — pill/bar hidden for empty collections */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  {videoMetaStr(progress.total, lang, t)}
                  {createdDate ? ` · ${createdDate}` : ''}
                </span>
                {progress.total > 0 && (
                  <span
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(29,158,117,0.15)', color: '#1D9E75' }}
                  >
                    {(t.progressPill ?? '')
                      .replace('{done}',  progress.completed)
                      .replace('{total}', progress.total)}
                  </span>
                )}
              </div>

              {/* Progress bar — hidden for empty collections */}
              {progress.total > 0 && (
                <div
                  className="mt-3 h-2 rounded-full overflow-hidden"
                  style={{ background: 'rgba(29,158,117,0.15)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${progress.pct}%`,
                      background: '#1D9E75',
                      transition: 'width 300ms ease-out',
                    }}
                  />
                </div>
              )}
            </div>

            {/* ── Error banner (e.g. RLS policy) ── */}
            {cvError && (
              <div className="px-4 py-3 rounded-xl text-sm text-red-600 dark:text-red-400
                              bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <strong>Error:</strong> {cvError}
              </div>
            )}

            {/* ── Completed banner (page load or single-video completion) ── */}
            {showCompletedBanner && !showCelebration && (
              <CompletedBanner
                collectionName={selectedCol?.name}
                stats={celebrationStats}
                lang={lang}
                t={t}
              />
            )}

            {/* ── Add Videos button ── */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddVids(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                           bg-primary-600 hover:bg-primary-700 text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
                </svg>
                {t.addToCollection}
              </button>
            </div>

            {/* ── Checklist ── */}
            {cvLoading ? (
              <div className="flex justify-center py-16"><Spinner size="w-6 h-6" /></div>
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
                <p className="text-sm" style={{ color: 'var(--muted)' }}>{t.emptyCollectionHint}</p>
              </div>
            ) : (
              <div
                className="rounded-2xl overflow-hidden divide-y"
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  boxShadow: 'var(--shadow-card)',
                  divideColor: 'var(--border)',
                }}
              >
                {colVideos.map((video, idx) => (
                  <ChecklistRow
                    key={video.id}
                    video={video}
                    idx={idx}
                    isNextUp={nextUpVideo?.id === video.id}
                    onToggle={handleToggleCompletion}
                    onRemove={() => handleRemoveVideo(video.id)}
                    onPlay={() => setActiveVideo(video)}
                    t={t}
                  />
                ))}
              </div>
            )}

            {/* ── Journey Notes ── */}
            {!cvLoading && colVideos.length > 0 && (
              <JourneyNotes
                notes={allNotes}
                onOpenVideo={(video) => setActiveVideo(video)}
                t={t}
              />
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
        <VideoPlayerModal
          video={activeVideo}
          initialTab="learn"
          onClose={() => setActiveVideo(null)}
        />
      )}

      {showCelebration && selectedCol && (
        <CelebrationModal
          collectionName={selectedCol.name}
          stats={celebrationStats}
          lang={lang}
          t={t}
          onDismiss={() => setShowCelebration(false)}
        />
      )}
    </div>
  )
}

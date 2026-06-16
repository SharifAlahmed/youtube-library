import { useState } from 'react'
import { useLang } from '../context/LanguageContext'

// ── Deterministic colour for domain badges ──────────────────────────────────
const DOMAIN_COLOURS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
]

function domainColour(str) {
  if (!str) return DOMAIN_COLOURS[0]
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return DOMAIN_COLOURS[h % DOMAIN_COLOURS.length]
}

// ── Thumbnail with fallback ──────────────────────────────────────────────────
function Thumbnail({ src, title }) {
  const [err, setErr] = useState(false)
  if (!src || err) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-primary-100 to-violet-200
                      dark:from-primary-900/40 dark:to-violet-900/40
                      flex items-center justify-center">
        <svg className="w-12 h-12 text-primary-400 dark:text-primary-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501
            s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805
            31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502
            9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0
            .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
        </svg>
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={title}
      onError={() => setErr(true)}
      className="w-full h-full object-cover"
    />
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function VideoCard({ video, onToggleWatched, onToggleSaved, onDelete }) {
  const { t } = useLang()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  const isWatched = video.watch_status === 'watched'
  const isSaved   = !!video.saved_for_later

  const run = async (fn) => {
    if (busy) return
    setBusy(true)
    await fn()
    setBusy(false)
  }

  const tags = Array.isArray(video.tags)
    ? video.tags
    : typeof video.tags === 'string'
      ? video.tags.split(',').map(s => s.trim()).filter(Boolean)
      : []

  return (
    <article className={`
      group relative flex flex-col rounded-2xl overflow-hidden
      bg-white dark:bg-gray-800
      border border-gray-100 dark:border-gray-700
      shadow-sm hover:shadow-md
      transition-all duration-200
      ${isWatched ? 'opacity-75 hover:opacity-100' : ''}
    `}>
      {/* ── Thumbnail ── */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-700">
        <Thumbnail src={video.thumbnail_url} title={video.title} />

        {/* Watched overlay badge */}
        {isWatched && (
          <div className="absolute top-2 start-2 flex items-center gap-1
                          bg-black/60 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"/>
            </svg>
            {t.watched}
          </div>
        )}

        {/* Saved badge */}
        {isSaved && (
          <div className="absolute top-2 end-2 flex items-center gap-1
                          bg-primary-600/90 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"/>
            </svg>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 p-4 gap-2">

        {/* Domain badge */}
        {video.domain && (
          <span className={`self-start text-xs font-semibold px-2 py-0.5 rounded-full ${domainColour(video.domain)}`}>
            {video.domain}
          </span>
        )}

        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug">
          {video.title || '—'}
        </h3>

        {/* Channel */}
        {video.channel && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {video.channel}
          </p>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tags.slice(0, 5).map(tag => (
              <span key={tag}
                className="text-xs px-2 py-0.5 rounded-full
                           bg-gray-100 dark:bg-gray-700
                           text-gray-600 dark:text-gray-300">
                {tag}
              </span>
            ))}
            {tags.length > 5 && (
              <span className="text-xs px-2 py-0.5 rounded-full
                               bg-gray-100 dark:bg-gray-700 text-gray-400">
                +{tags.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* ── Actions ── */}
        {confirmDelete ? (
          <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => run(onDelete)}
              disabled={busy}
              className="flex-1 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700
                         disabled:bg-red-400 text-white rounded-lg transition-colors"
            >
              {t.confirmDelete}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-600
                         text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700
                         rounded-lg transition-colors"
            >
              {t.cancel}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">

            {/* Watch toggle */}
            <button
              onClick={() => run(onToggleWatched)}
              disabled={busy}
              title={isWatched ? t.markUnwatched : t.markWatched}
              className={`
                flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium
                transition-colors disabled:opacity-50
                ${isWatched
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}
              `}
            >
              {isWatched ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"/>
                  </svg>
                  {t.watched}
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7
                         -1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                  {t.unwatched}
                </>
              )}
            </button>

            {/* Save toggle */}
            <button
              onClick={() => run(onToggleSaved)}
              disabled={busy}
              title={isSaved ? t.removeSaved : t.saveForLater}
              className={`
                p-2 rounded-lg transition-colors disabled:opacity-50
                ${isSaved
                  ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/60'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}
              `}
            >
              <svg className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor"
                strokeWidth={isSaved ? 0 : 2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
              </svg>
            </button>

            {/* Delete */}
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
              title={t.deleteVideo}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700
                         text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20
                         hover:text-red-500 dark:hover:text-red-400
                         transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>

          </div>
        )}

      </div>
    </article>
  )
}

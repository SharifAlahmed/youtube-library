import { useEffect } from 'react'
import { useLang } from '../context/LanguageContext'

export default function VideoPlayerModal({ video, onClose }) {
  const { t } = useLang()

  // Escape key → close
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button — RTL-safe with end-3 */}
        <button
          onClick={onClose}
          title={t.close}
          className="absolute top-3 end-3 z-10 p-2 rounded-full bg-black/60 text-white
                     hover:bg-black/80 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>

        {/* 16:9 responsive iframe */}
        <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1`}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Title + channel bar */}
        <div className="p-4 bg-gray-900 text-white">
          <h2 className="text-sm font-semibold line-clamp-2">{video.title}</h2>
          {video.channel && (
            <p className="text-xs text-gray-400 mt-1">{video.channel}</p>
          )}
        </div>
      </div>
    </div>
  )
}

import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="flex gap-4 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary-50 shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const { session, loading } = useAuth()
  const { t, toggleLang } = useLang()

  if (loading) return null
  if (session) return <Navigate to="/app" replace />

  return (
    <div className="min-h-screen bg-white" dir={t.dir}>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501
                  s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805
                  31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502
                  9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0
                  .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">Lumina</span>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleLang}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200
                         text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {t.language}
            </button>
            <Link
              to="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {t.landingLogin}
            </Link>
            <Link
              to="/login?mode=signup"
              className="text-sm font-semibold px-4 py-2 bg-primary-600 hover:bg-primary-700
                         text-white rounded-xl transition-colors"
            >
              {t.landingCta}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* gradient blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary-100 rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute top-10 -right-24 w-72 h-72 bg-violet-100 rounded-full blur-3xl opacity-50 pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest
                           text-primary-600 bg-primary-50 px-3 py-1 rounded-full mb-6">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501
                s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805
                31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502
                9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0
                .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
            </svg>
            {t.landingBadge}
          </span>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
            {t.landingHeadline1}<br className="hidden sm:block" />
            <span className="text-primary-600"> {t.landingHeadline2}</span>
          </h1>

          <p className="max-w-xl mx-auto text-lg text-gray-500 leading-relaxed mb-10">
            {t.landingSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/login?mode=signup"
              className="px-7 py-3.5 bg-primary-600 hover:bg-primary-700 text-white
                         font-semibold rounded-2xl transition-colors text-base shadow-lg shadow-primary-200"
            >
              {t.landingCta}
            </Link>
            <Link
              to="/login"
              className="px-7 py-3.5 border border-gray-200 hover:border-gray-300
                         text-gray-700 font-semibold rounded-2xl transition-colors text-base"
            >
              {t.landingLogin}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Founder story ───────────────────────────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">
            {t.landingWhyTitle}
          </p>
          <p className="text-xl text-gray-700 leading-relaxed">
            I used to track videos in Notion docs, paste links into Excel sheets, and
            dump playlists into messy Drive folders — only to lose them anyway.
            Lumina was built to give every video that matters a{' '}
            <span className="font-semibold text-gray-900">permanent, searchable home</span>:
            with your notes, your AI prompts, and the links that go with it — all in one place.
          </p>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <p className="text-center text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Everything you need
        </p>
        <h2 className="text-center text-3xl font-bold text-gray-900 mb-12">
          Stop losing videos. Start building knowledge.
        </h2>

        <div className="grid sm:grid-cols-3 gap-5">
          <FeatureCard
            icon={
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 4v16m8-8H4"/>
              </svg>
            }
            title="Capture in one click"
            desc="Paste a YouTube URL and Lumina fetches the title, channel, and thumbnail automatically."
          />
          <FeatureCard
            icon={
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            }
            title="Your Knowledge Hub"
            desc="Attach notes, AI prompts, and reference links to every video — all surfaced the moment you need them."
          />
          <FeatureCard
            icon={
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            }
            title="Search everything"
            desc="Find any saved video instantly by title, channel, tag, or domain — no more digging through playlists."
          />
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="bg-primary-600">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">
            Ready to build your library?
          </h2>
          <p className="text-primary-200 mb-8 text-base">
            Free to start. No credit card required.
          </p>
          <Link
            to="/login?mode=signup"
            className="inline-block px-8 py-3.5 bg-white hover:bg-gray-50 text-primary-700
                       font-semibold rounded-2xl transition-colors text-base shadow-lg"
          >
            {t.landingCta}
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-600 rounded-md flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501
                  s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805
                  31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502
                  9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0
                  .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-700">Lumina</span>
          </div>
          <p className="text-xs text-gray-400">© 2026 Lumina. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}

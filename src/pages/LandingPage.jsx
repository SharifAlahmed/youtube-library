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
            <span className="text-lg font-bold text-gray-900 tracking-tight">Luminaverse</span>
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
            {t.whyBody}
          </p>
        </div>
      </section>

      {/* ── Problem / Solution ──────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          {/* Header */}
          <p className="text-center text-xs font-bold uppercase tracking-widest text-primary-600 mb-3">
            {t.landingProblemBadge}
          </p>
          <h2 className="text-center text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
            {t.landingProblemHead}
          </h2>
          <p className="text-center text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
            {t.landingProblemSub}
          </p>

          {/* Before / After columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ❌ Old way */}
            <div className="rounded-2xl p-8 bg-gray-50 border border-gray-100">
              <p className="flex items-center gap-2 font-bold text-gray-700 text-base mb-5">
                <span className="text-xl">❌</span> {t.landingOldTitle}
              </p>
              <ul className="space-y-3">
                {[t.landingOld1, t.landingOld2, t.landingOld3, t.landingOld4].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-500 leading-relaxed">
                    <span className="mt-0.5 shrink-0 text-red-400">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* ✅ Luminaverse way */}
            <div className="rounded-2xl p-8 bg-primary-50 border border-primary-100">
              <p className="flex items-center gap-2 font-bold text-primary-800 text-base mb-5">
                <span className="text-xl">✅</span> {t.landingNewTitle}
              </p>
              <ul className="space-y-3">
                {[t.landingNew1, t.landingNew2, t.landingNew3, t.landingNew4].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-primary-800 leading-relaxed">
                    <span className="mt-0.5 shrink-0 text-primary-500">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works stepper ────────────────────────────────────────── */}
      <section className="bg-gray-50 border-y border-gray-100 py-20">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header */}
          <p className="text-center text-xs font-bold uppercase tracking-widest text-primary-600 mb-3">
            {t.landingHowBadge}
          </p>
          <h2 className="text-center text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight mb-16">
            {t.landingHowHead}
          </h2>

          {/* Stepper */}
          <div className="relative">
            {/* connector line — desktop only */}
            <div className="hidden sm:block absolute top-6 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-0.5 bg-primary-100" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center text-lg font-bold mb-4 shadow-md shadow-primary-200 shrink-0">
                  1
                </div>
                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary-100 mb-3">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{t.landingHow1Title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t.landingHow1Desc}</p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center text-lg font-bold mb-4 shadow-md shadow-primary-200 shrink-0">
                  2
                </div>
                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary-100 mb-3">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{t.landingHow2Title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t.landingHow2Desc}</p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center text-lg font-bold mb-4 shadow-md shadow-primary-200 shrink-0">
                  3
                </div>
                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary-100 mb-3">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{t.landingHow3Title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t.landingHow3Desc}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <p className="text-center text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">
          {t.featuresSectionBadge}
        </p>
        <h2 className="text-center text-3xl font-bold text-gray-900 mb-12">
          {t.featuresHeadline}
        </h2>

        <div className="grid sm:grid-cols-3 gap-5">
          <FeatureCard
            icon={
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 4v16m8-8H4"/>
              </svg>
            }
            title={t.feature1Title}
            desc={t.feature1Desc}
          />
          <FeatureCard
            icon={
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            }
            title={t.feature2Title}
            desc={t.feature2Desc}
          />
          <FeatureCard
            icon={
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            }
            title={t.feature3Title}
            desc={t.feature3Desc}
          />
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="bg-primary-600">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-3">
            {t.ctaHeadline}
          </h2>
          <p className="text-primary-200 mb-8 text-base" dir="ltr" style={{ textAlign: 'center' }}>
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
            <span className="text-sm font-semibold text-gray-700">Luminaverse</span>
          </div>
          <p className="text-xs text-gray-400" dir="ltr">© 2026 Luminaverse. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}

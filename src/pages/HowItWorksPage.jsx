import { useNavigate } from 'react-router-dom'
import { useLibrary } from '../context/LibraryContext'
import { useLang } from '../context/LanguageContext'

export default function HowItWorksPage() {
  const { openAddModal } = useLibrary()
  const { t } = useLang()
  const navigate = useNavigate()

  const STEPS = [
    { num: '①', icon: '🔗', title: t.hiwStep1Title, desc: t.hiwStep1Desc },
    { num: '②', icon: '✍️', title: t.hiwStep2Title, desc: t.hiwStep2Desc },
    { num: '③', icon: '📚', title: t.hiwStep3Title, desc: t.hiwStep3Desc },
    { num: '④', icon: '🚫', title: t.hiwStep4Title, desc: t.hiwStep4Desc },
  ]

  function handleStart() {
    openAddModal()
    navigate('/app')
  }

  return (
    <div dir={t.dir} className="max-w-5xl mx-auto px-6 py-14">

      {/* ── Hero ── */}
      <h1
        className="text-3xl font-extrabold text-center mb-5 leading-snug"
        style={{ color: 'var(--ink)' }}
      >
        {t.hiwHero}
      </h1>

      {/* ── Intro ── */}
      <p
        className="text-center mb-12 mx-auto max-w-xl"
        style={{ fontSize: '16px', lineHeight: '2', color: 'var(--muted)' }}
      >
        {t.hiwIntro1}{' '}
        {t.hiwIntro2}{' '}
        <span style={{ color: 'var(--ink)', fontWeight: 500 }}>
          {t.hiwIntro3}
        </span>
      </p>

      {/* ── Step cards — 4-up on lg, 2-up on sm, stacked on mobile ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
        {STEPS.map((step, i) => (
          <div
            key={i}
            className="rounded-2xl p-6 text-center flex flex-col items-center gap-3"
            style={{
              background: 'var(--card)',
              border:     '1px solid var(--border)',
              boxShadow:  'var(--shadow-card)',
            }}
          >
            <span className="text-4xl">{step.icon}</span>
            <p className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
              {step.num}&nbsp;{step.title}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              {step.desc}
            </p>
          </div>
        ))}
      </div>

      {/* ── Closing line ── */}
      <p
        className="text-center font-medium mb-10"
        style={{ fontSize: '17px', color: 'var(--ink)' }}
      >
        {t.hiwClosing}
      </p>

      {/* ── CTA ── */}
      <div className="flex justify-center">
        <button
          onClick={handleStart}
          className="px-10 py-3 rounded-xl text-base font-semibold text-white
                     transition-opacity hover:opacity-90 focus:outline-none"
          style={{ background: 'var(--accent)' }}
        >
          {t.hiwCta}
        </button>
      </div>

    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { useLibrary } from '../context/LibraryContext'

const STEPS = [
  {
    num: '①',
    icon: '🔗',
    title: 'أضف أي فيديو يوتيوب',
    desc: 'الصق الرابط، يُحفظ في مكتبتك مباشرة.',
  },
  {
    num: '②',
    icon: '✍️',
    title: 'سجّل ما تعلّمته',
    desc: 'اكتب درسك الأساسي، سؤالك، أو ما ستطبّقه — كلها في مكان واحد.',
  },
  {
    num: '③',
    icon: '📚',
    title: 'ارجع لها متى تريد',
    desc: 'مكتبة منظّمة، قابلة للبحث، كل شيء في مكانه.',
  },
  {
    num: '④',
    icon: '🚫',
    title: 'بدون إعلانات',
    desc: 'فيديوهاتك تُشغَّل داخل Lumina مباشرة — بدون مقاطعة، بدون تشتيت.',
  },
]

export default function HowItWorksPage() {
  const { openAddModal } = useLibrary()
  const navigate = useNavigate()

  function handleStart() {
    openAddModal()
    navigate('/app')
  }

  return (
    <div dir="rtl" className="max-w-5xl mx-auto px-6 py-14">

      {/* ── Hero ── */}
      <h1
        className="text-3xl font-extrabold text-center mb-5 leading-snug"
        style={{ color: 'var(--ink)' }}
      >
        Lumina — حوّل يوتيوب لجامعتك الخاصة
      </h1>

      {/* ── Intro ── */}
      <p
        className="text-center mb-12 mx-auto max-w-xl"
        style={{ fontSize: '16px', lineHeight: '2', color: 'var(--muted)' }}
      >
        كلنا نشاهد ساعات على يوتيوب.{' '}
        لكن كم منها يتحوّل فعلاً لتطوّر؟{' '}
        <span style={{ color: 'var(--ink)', fontWeight: 500 }}>
          Lumina تساعدك تبني مكتبة تعلّم شخصية من الفيديوهات اللي تختارها —
          بدل ما تضيع في الـ Watch Later وما ترجع لها.
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
        لكل من يريد أن يتعلّم بقصد — لا أن يشاهد بدون أثر.
      </p>

      {/* ── CTA ── */}
      <div className="flex justify-center">
        <button
          onClick={handleStart}
          className="px-10 py-3 rounded-xl text-base font-semibold text-white
                     transition-opacity hover:opacity-90 focus:outline-none"
          style={{ background: 'var(--accent)' }}
        >
          أضف أول فيديو الآن
        </button>
      </div>

    </div>
  )
}

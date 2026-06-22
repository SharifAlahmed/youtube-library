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
]

export default function HowItWorksPage() {
  const { openAddModal } = useLibrary()

  return (
    <div dir="rtl" className="max-w-2xl mx-auto px-6 py-14">

      {/* ── Hero ── */}
      <h1
        className="text-3xl font-extrabold text-center mb-5 leading-snug"
        style={{ color: 'var(--ink)' }}
      >
        Lumina — حوّل يوتيوب لجامعتك الخاصة
      </h1>

      {/* ── Intro ── */}
      <div
        className="text-center mb-12 space-y-1.5"
        style={{ fontSize: '16px', lineHeight: '1.9', color: 'var(--muted)' }}
      >
        <p>كلنا نشاهد ساعات على يوتيوب.</p>
        <p>لكن كم منها يتحوّل فعلاً لتطوّر؟</p>
        <p
          className="mt-4 text-base font-medium"
          style={{ color: 'var(--ink)' }}
        >
          Lumina تساعدك تبني مكتبة تعلّم شخصية من الفيديوهات اللي تختارها —
          بدل ما تضيع في الـ Watch Later وما ترجع لها.
        </p>
      </div>

      {/* ── Step cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12">
        {STEPS.map((step, i) => (
          <div
            key={i}
            className="rounded-2xl p-6 text-center flex flex-col items-center gap-3"
            style={{
              background:    'var(--card)',
              border:        '1px solid var(--border)',
              boxShadow:     'var(--shadow-card)',
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
        className="text-center text-sm italic mb-10"
        style={{ color: 'var(--muted)' }}
      >
        لكل من يريد أن يتعلّم بقصد — لا أن يشاهد بدون أثر.
      </p>

      {/* ── CTA ── */}
      <div className="flex justify-center">
        <button
          onClick={openAddModal}
          className="px-10 py-3 rounded-xl text-base font-semibold text-white
                     transition-opacity hover:opacity-90 focus:outline-none
                     focus:ring-2 focus:ring-offset-2"
          style={{
            background:    'var(--accent)',
            focusRingColor:'var(--accent)',
          }}
        >
          ابدأ الآن
        </button>
      </div>

    </div>
  )
}

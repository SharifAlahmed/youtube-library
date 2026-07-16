import { useState } from 'react'

export default function HelpTip({ tip, dark = false }) {
  const [show, setShow] = useState(false)

  return (
    <span className="relative inline-flex items-center shrink-0">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        onClick={e => { e.preventDefault(); setShow(s => !s) }}
        aria-label={tip}
        className={`
          w-[15px] h-[15px] rounded-full inline-flex items-center justify-center
          border text-[9px] font-bold leading-none transition-colors cursor-help shrink-0
          ${dark
            ? 'border-gray-600 text-gray-500 hover:border-primary-400 hover:text-primary-400'
            : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
          }
        `}
      >
        ?
      </button>
      {show && (
        <span
          role="tooltip"
          className="absolute z-50 bottom-full mb-2 start-0 w-56
                     px-3 py-2.5 rounded-xl text-xs leading-relaxed
                     pointer-events-none shadow-lg"
          style={dark ? {
            background: '#1e2a3b',
            border: '1px solid #374151',
            color: '#e2e8f0',
          } : {
            background: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--ink)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {tip}
        </span>
      )}
    </span>
  )
}

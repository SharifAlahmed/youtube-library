import { useLang } from '../context/LanguageContext'

const LINKS = [
  { key: 'footerPrivacy', href: '/privacy-policy.html' },
  { key: 'footerTerms',   href: '/terms-of-use.html'  },
  { key: 'footerFaq',     href: '/faq.html'            },
  { key: 'footerAbout',   href: '/about-us.html'       },
]

export default function Footer() {
  const { t } = useLang()

  return (
    <footer
      className="w-full mt-auto"
      style={{ background: '#15332a', color: 'rgba(255,255,255,0.7)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col items-center gap-2 text-center">

        {/* Links row */}
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1">
          {LINKS.map(({ key, href }) => (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs hover:underline transition-colors"
              style={{ color: '#6ee7b7' }}
            >
              {t[key]}
            </a>
          ))}
        </div>

        {/* Copyright */}
        <p className="text-xs" dir="ltr">{t.footerCopyright}</p>

        {/* Disclaimer */}
        <p className="text-xs max-w-xl" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {t.footerDisclaimer}
        </p>

      </div>
    </footer>
  )
}

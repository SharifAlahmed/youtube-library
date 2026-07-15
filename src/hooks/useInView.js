import { useEffect, useRef, useState } from 'react'

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useInView(options = {}) {
  const ref = useRef(null)
  // If reduced-motion is set, start as already visible — no animation at all
  const [inView, setInView] = useState(prefersReduced)

  useEffect(() => {
    if (prefersReduced) return
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.unobserve(el) // fire once
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -32px 0px', ...options }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, inView]
}

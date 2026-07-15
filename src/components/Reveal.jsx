import { useInView } from '../hooks/useInView'

/**
 * Scroll-reveal wrapper. Fades + slides up children when they enter the viewport.
 * Uses opacity + translateY only (GPU-friendly, RTL-safe, no CLS).
 * Respects prefers-reduced-motion via the useInView hook.
 */
export default function Reveal({ children, delay = 0, className = '' }) {
  const [ref, inView] = useInView()

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity:    inView ? 1 : 0,
        transform:  inView ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms`,
        willChange: inView ? 'auto' : 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}

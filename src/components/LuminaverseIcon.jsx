import { useId } from 'react'

export default function LuminaverseIcon({ className = 'w-5 h-5' }) {
  const uid = useId()
  const coreId = `lv-core-${uid}`
  const haloId = `lv-halo-${uid}`
  const starId = `lv-star-${uid}`

  return (
    <svg className={className} viewBox="0 0 100 100" role="img" aria-label="LuminaVerse">
      <defs>
        <radialGradient id={coreId} cx="38%" cy="34%" r="72%">
          <stop offset="0" stopColor="#D6F7E7" />
          <stop offset="0.42" stopColor="#54CBA0" />
          <stop offset="1" stopColor="#1B9A71" />
        </radialGradient>
        <radialGradient id={haloId} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#1D9E75" stopOpacity="0.20" />
          <stop offset="0.65" stopColor="#1D9E75" stopOpacity="0.05" />
          <stop offset="1" stopColor="#1D9E75" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={starId} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#E6FCF2" stopOpacity="0.95" />
          <stop offset="1" stopColor="#7FDCB6" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r="40" fill={`url(#${haloId})`} />
      <ellipse cx="50" cy="50" rx="40" ry="15" transform="rotate(-22 50 50)"
        fill="none" stroke="#1D9E75" strokeWidth="2.4" strokeOpacity="0.55"
        vectorEffect="non-scaling-stroke" />
      <circle cx="50" cy="50" r="20" fill={`url(#${coreId})`} />
      <circle cx="50" cy="50" r="20" fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="1" />
      <circle cx="76" cy="33" r="9" fill={`url(#${starId})`} />
      <circle cx="76" cy="33" r="4.6" fill="#EAFCF4" />
      <circle cx="74.6" cy="31.6" r="1.6" fill="#ffffff" />
    </svg>
  )
}

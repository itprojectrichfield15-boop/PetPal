'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: number
  glow?: boolean
  variant?: 'mark' | 'wordmark'
}

/**
 * PetPal logo — a crisp, high-contrast paw mark on an emerald tile.
 */
export default function Logo({ className, size = 38, glow = false, variant = 'mark' }: LogoProps) {
  if (variant === 'wordmark') {
    return (
      <div className={cn('flex items-center gap-2.5', className)}>
        <LogoMark size={size} glow={glow} />
        <span className="text-lg font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Pet<span className="text-primary">Pal</span>
        </span>
      </div>
    )
  }
  return <LogoMark size={size} glow={glow} className={className} />
}

function LogoMark({ size = 38, glow = false, className }: { size?: number; glow?: boolean; className?: string }) {
  // useId gives a stable, collision-free id per instance (and matches between
  // server and client render). Sanitised because raw useId contains ':'.
  const id = 'pp' + useId().replace(/:/g, '')
  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center shrink-0',
        glow && 'shadow-[0_6px_28px_rgba(255,174,109,0.45)]',
        className
      )}
      style={{ width: size, height: size, borderRadius: size * 0.28 }}
      aria-label="PetPal logo"
    >
      <svg viewBox="0 0 48 48" width={size} height={size} className="relative z-10">
        <defs>
          <linearGradient id={`${id}-tile`} x1="6" y1="2" x2="42" y2="46" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFC79A" />
            <stop offset="50%" stopColor="#FFAE6D" />
            <stop offset="100%" stopColor="#E0682F" />
          </linearGradient>
          {/* Soft inner shadow for depth on the beans */}
          <radialGradient id={`${id}-bean`} cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#3A140C" />
            <stop offset="100%" stopColor="#220A06" />
          </radialGradient>
          <filter id={`${id}-sh`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0.5" stdDeviation="0.5" floodColor="#1A0703" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Tile */}
        <rect x="0" y="0" width="48" height="48" rx="14" fill={`url(#${id}-tile)`} />
        {/* Top sheen + bottom shade for dimensionality */}
        <rect x="0" y="0" width="48" height="20" rx="14" fill="#FFFFFF" opacity="0.18" />
        <rect x="0" y="30" width="48" height="18" rx="14" fill="#000000" opacity="0.08" />

        {/* Realistic paw — rounded organic pads with soft shadow */}
        <g fill={`url(#${id}-bean)`} filter={`url(#${id}-sh)`}>
          {/* main pad — heart-ish, rounded */}
          <path d="M24 39c-3.4 0-6.5-1.4-7.6-3.9-1-2.3.2-4.6 2.1-6.2 1.6-1.3 2.6-2.6 3.1-3.7.6-1.2 1.4-1.9 2.4-1.9s1.8.7 2.4 1.9c.5 1.1 1.5 2.4 3.1 3.7 1.9 1.6 3.1 3.9 2.1 6.2C30.5 37.6 27.4 39 24 39z" />
          {/* four toe beans — graduated sizes, splayed naturally */}
          <ellipse cx="13.8" cy="24" rx="3" ry="3.9" transform="rotate(-24 13.8 24)" />
          <ellipse cx="19.8" cy="16.6" rx="3.1" ry="4.2" transform="rotate(-8 19.8 16.6)" />
          <ellipse cx="28.2" cy="16.6" rx="3.1" ry="4.2" transform="rotate(8 28.2 16.6)" />
          <ellipse cx="34.2" cy="24" rx="3" ry="3.9" transform="rotate(24 34.2 24)" />
        </g>
        {/* tiny highlights on beans for a soft, real sheen */}
        <g fill="#FFAE6D" opacity="0.35">
          <ellipse cx="19" cy="15" rx="1" ry="1.4" />
          <ellipse cx="27.4" cy="15" rx="1" ry="1.4" />
          <ellipse cx="22.5" cy="29" rx="1.6" ry="1.1" />
        </g>

        {/* Crisp border */}
        <rect x="0.6" y="0.6" width="46.8" height="46.8" rx="13.5" fill="none" stroke="#FFFFFF" strokeOpacity="0.2" strokeWidth="1.1" />
      </svg>
    </div>
  )
}

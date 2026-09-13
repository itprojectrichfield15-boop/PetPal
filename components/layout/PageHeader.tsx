'use client'

import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import type { AnimalKey } from '@/lib/animal-shapes'

/**
 * The shared header for every tool page.
 *
 * Before this, each screen invented its own header — different badge styles,
 * different heading sizes, a lone coloured word here and a gradient there. One
 * component means the tools read as one product, and the landing page's
 * editorial language (eyebrow rule, display type, serif italic accent) carries
 * through instead of stopping at the front door.
 *
 * Each page picks its own `species` so the 3D motif differs from screen to
 * screen rather than every tool wearing the same banner.
 */

const AuraCanvas = dynamic(() => import('@/components/public/AuraCanvas'), { ssr: false })

const EASE = [0.16, 1, 0.3, 1] as const

export default function PageHeader({
  eyebrow,
  icon: Icon,
  title,
  accent,
  sub,
  species,
  action,
}: {
  eyebrow: string
  icon?: LucideIcon
  /** Leading part of the heading, set in the display face. */
  title: string
  /** Trailing part, set in serif italic and tinted — the editorial accent. */
  accent?: string
  sub?: string
  /** Which animal the header's 3D motif forms. Omit for no 3D. */
  species?: AnimalKey
  /** Optional right-hand control, e.g. an "Add" button. */
  action?: React.ReactNode
}) {
  return (
    <header className="relative overflow-hidden border-b border-white/[0.07]">
      {/* Warm bloom behind the title */}
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            'radial-gradient(70% 120% at 12% 0%, rgba(255,174,109,0.13) 0%, transparent 62%), radial-gradient(50% 100% at 88% 10%, rgba(142,139,245,0.12) 0%, transparent 62%)',
        }}
        aria-hidden="true"
      />

      {/* 3D motif, right-hand side, desktop only — it must never crowd the tool */}
      {species && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-[42%] hidden lg:block">
          <AuraCanvas species={species} className="w-full h-full" />
          <div
            className="absolute inset-0 bg-gradient-to-r from-[var(--bg)] via-[var(--bg)]/45 to-transparent"
            aria-hidden="true"
          />
        </div>
      )}

      <div className="relative px-6 lg:px-8 pt-12 pb-10 lg:pt-16 lg:pb-14 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="flex items-start justify-between gap-8"
        >
          <div className="min-w-0 max-w-2xl">
            <div className="inline-flex items-center gap-2.5 mb-5">
              {Icon ? (
                <span className="w-7 h-7 rounded-lg bg-[var(--apricot)]/12 border border-[var(--apricot)]/25 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-[var(--apricot)]" aria-hidden="true" />
                </span>
              ) : (
                <span className="w-6 h-px bg-[var(--apricot)]" aria-hidden="true" />
              )}
              <span className="text-[11px] uppercase tracking-[0.26em] text-[var(--apricot)] font-medium">
                {eyebrow}
              </span>
            </div>

            <h1
              className="text-[2.4rem] md:text-5xl lg:text-[3.5rem] font-semibold leading-[1.03] tracking-[-0.035em] mb-4"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <span className="text-gradient-soft">{title}</span>
              {accent && (
                <>
                  {' '}
                  <span
                    style={{ fontFamily: 'var(--font-serif)' }}
                    className="italic font-normal text-[var(--apricot)]"
                  >
                    {accent}
                  </span>
                </>
              )}
            </h1>

            {sub && <p className="text-zinc-400 text-[15px] md:text-base leading-relaxed max-w-xl">{sub}</p>}
          </div>

          {action && <div className="shrink-0 hidden sm:block">{action}</div>}
        </motion.div>

        {action && <div className="sm:hidden mt-6">{action}</div>}
      </div>
    </header>
  )
}

'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, ArrowRight, PawPrint, Apple, Star, ShieldCheck, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Owner avatars for the social-proof pill. */
const FACES = [
  'photo-1438761681033-6461ffad8d80',
  'photo-1500648767791-00dcc994a43e',
  'photo-1494790108377-be9c29b29330',
]

const EASE = [0.16, 1, 0.3, 1] as const

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-28 pb-20 overflow-hidden grain">
      <div className="absolute inset-0 bg-grid opacity-30" aria-hidden="true" />

      {/* Readability scrim so the headline always clears the 3D layer behind it */}
      <div
        className="absolute inset-0 pointer-events-none lg:bg-gradient-to-r lg:from-[var(--bg)] lg:via-[var(--bg)]/55 lg:to-transparent bg-[var(--bg)]/35"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
            className="inline-flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-xl mb-7"
          >
            <div className="flex -space-x-2">
              {FACES.map((p, i) => (
                <div key={i} className="relative w-6 h-6 rounded-full overflow-hidden border-2 border-[#0D0A14]">
                  <Image src={`https://images.unsplash.com/${p}?w=48&h=48&fit=crop`} alt="" fill className="object-cover" sizes="24px" />
                </div>
              ))}
            </div>
            <span className="text-xs text-zinc-200 font-medium">Loved by 120,000+ pet parents</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.8, ease: EASE }}
            className="text-5xl md:text-6xl lg:text-7xl font-semibold leading-[0.98] tracking-[-0.035em] mb-6"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <span className="block text-gradient-soft">The whole world of</span>
            <span className="block">
              <span style={{ fontFamily: 'var(--font-serif)' }} className="italic font-normal text-primary">pet care</span>
              <span className="text-gradient-soft">, in one app.</span>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.6, ease: EASE }}
            className="text-lg text-zinc-300 max-w-lg leading-relaxed mb-9"
          >
            Smart feeding plans, instant food-safety checks, health tracking and trusted vets near you —
            for dogs, cats, rabbits, birds, reptiles and every small creature in between.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34, duration: 0.6, ease: EASE }}
            className="flex flex-col sm:flex-row gap-3 mb-10"
          >
            <Link href="/auth/signup">
              <Button size="lg" className="btn-glass-primary text-base px-7 py-6 gap-2 group rounded-2xl w-full sm:w-auto">
                <PawPrint className="w-5 h-5" /> Add Your Pet
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Button>
            </Link>
            <Link href="/nutrition">
              <Button size="lg" className="btn-glass text-white text-base px-7 py-6 gap-2 group rounded-2xl w-full sm:w-auto">
                <Apple className="w-5 h-5" /> Try the Planner
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center gap-x-8 gap-y-4"
          >
            <div>
              <div className="text-2xl font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>120k+</div>
              <div className="text-xs text-zinc-500">pet parents</div>
            </div>
            <div className="w-px h-8 bg-white/10" aria-hidden="true" />
            <div>
              <div className="text-2xl font-semibold tabular-nums flex items-center gap-1" style={{ fontFamily: 'var(--font-display)' }}>
                4.9 <Star className="w-4 h-4 text-[#FFD98E] fill-[#FFD98E]" aria-hidden="true" />
              </div>
              <div className="text-xs text-zinc-500">avg. rating</div>
            </div>
            <div className="w-px h-8 bg-white/10" aria-hidden="true" />
            <div>
              <div className="text-2xl font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>18k+</div>
              <div className="text-xs text-zinc-500">pets tracked</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Floating proof chips (desktop only — they'd crowd a phone) ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, ease: EASE }}
        className="hidden xl:flex absolute right-[12%] top-[22%] z-10 glass-card rounded-2xl p-3.5 pr-5 items-center gap-3 shadow-2xl"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
          <Apple className="w-4 h-4 text-primary" aria-hidden="true" />
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">Biscuit&rsquo;s plan</div>
          <div className="text-[11px] text-zinc-400">742 kcal · 2 meals</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05, ease: EASE }}
        className="hidden xl:flex absolute right-[8%] bottom-[26%] z-10 glass-card rounded-2xl p-3.5 pr-5 items-center gap-3 shadow-2xl"
      >
        <div className="w-9 h-9 rounded-xl bg-[#8E8BF5]/15 border border-[#8E8BF5]/25 flex items-center justify-center shrink-0">
          <MapPin className="w-4 h-4 text-[#8E8BF5]" aria-hidden="true" />
        </div>
        <div>
          {/*
            * No star rating here, deliberately. The vet finder states in its own
            * footnote that PetPal does not rank, rate or endorse individual
            * practices — it shows OpenStreetMap records and omits anything OSM
            * does not know rather than inventing it. A decorative card promising
            * "★ 4.9" contradicted the product's own position and advertised a
            * feature that does not exist. Distance and opening hours are real
            * things the finder does show.
            */}
          <div className="text-sm font-semibold leading-tight">Vet 1.2km away</div>
          <div className="text-[11px] text-zinc-400">Opening hours listed</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.2, ease: EASE }}
        className="hidden xl:flex absolute right-[26%] bottom-[14%] z-10 glass-card rounded-full px-4 py-2 items-center gap-2 shadow-2xl"
      >
        <ShieldCheck className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
        <span className="text-xs font-medium">Chocolate? <span className="text-[#FF6B81]">Toxic</span> — checked</span>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1.5 text-zinc-500"
        aria-hidden="true"
      >
        <span className="text-[10px] uppercase tracking-widest">Scroll</span>
        <motion.div animate={{ y: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <ArrowRight className="w-4 h-4 rotate-90" />
        </motion.div>
      </motion.div>
    </section>
  )
}

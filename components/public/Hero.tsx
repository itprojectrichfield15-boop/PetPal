'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowUpRight, ArrowRight, PawPrint, Apple, ShieldCheck, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FOOD_DB } from '@/lib/food-safety'
import { SPECIES_CFG, computePlan } from '@/lib/nutrition'

/*
 * Proof points. These used to read "Loved by 120,000+ pet parents", "4.9 avg.
 * rating" and "18k+ pets tracked" beside three stock-photo faces — figures
 * nobody measured for an app that has no ratings and whose pet count is
 * private by design. Everything here can now be checked by opening the app.
 */
const PROOF = [
  { value: String(FOOD_DB.length), label: 'foods & plants checked' },
  { value: String(Object.keys(SPECIES_CFG).length), label: 'species in the planner' },
  { value: 'Free', label: 'no paid tier' },
]

/*
 * The example chip is calculated by the same engine as the planner. It used to
 * say "742 kcal" as typed text, while the planner gives 740 for the same
 * 12.4 kg adult beagle — the front page contradicting the tool it advertised.
 */
const EXAMPLE_PLAN = computePlan({ species: 'dog', weightKg: 12.4, activity: 1.6, lifeStage: 'adult' })

const EASE =[0.16, 1, 0.3, 1] as const

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
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-xl mb-7"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            <span className="text-xs text-zinc-200 font-medium">Free · most tools work without an account</span>
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
            Feeding plans, instant food-safety checks, reminders and weight tracking, and real vet practices
            mapped near you —
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
            {PROOF.map((p, i) => (
              <div key={p.label} className="flex items-center gap-8">
                {i > 0 && <div className="w-px h-8 bg-white/10 -ml-8" aria-hidden="true" />}
                <div>
                  <div className="text-2xl font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{p.value}</div>
                  <div className="text-xs text-zinc-500">{p.label}</div>
                </div>
              </div>
            ))}
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
          <div className="text-[11px] text-zinc-400">{EXAMPLE_PLAN.mer} kcal · {EXAMPLE_PLAN.meals} meals</div>
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
          <div className="text-sm font-semibold leading-tight">Practices near you</div>
          <div className="text-[11px] text-zinc-400">Sorted by distance</div>
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

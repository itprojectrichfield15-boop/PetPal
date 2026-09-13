'use client'

import { motion, useScroll, useTransform, AnimatePresence, useInView, useSpring, useMotionValue } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowUpRight, ArrowRight, Apple, ShieldCheck, Heart, MapPin, MessageSquare,
  ClipboardCheck, CheckCircle2, Plus, Cat, Dog, Activity, Minus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Navbar from '@/components/public/Navbar'
import Logo from '@/components/public/Logo'
import Hero from '@/components/public/Hero'
import AnimalField from '@/components/public/AnimalField'
import { computePlan, SPECIES_CFG, type LifeStage } from '@/lib/nutrition'
import { usePrefersReducedMotion } from '@/lib/use-client-value'

const EASE = [0.16, 1, 0.3, 1] as const

/* ═══════════════════════════════════════════════════════════════════════════
   Shared primitives
   ═══════════════════════════════════════════════════════════════════════════ */

/** Fade-and-rise on scroll into view. One place, so timing stays consistent. */
function Reveal({
  children, delay = 0, y = 22, className,
}: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ delay, duration: 0.7, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/** Small uppercase label — the editorial anchor above each heading. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 mb-5">
      <span className="w-6 h-px bg-[var(--apricot)]" aria-hidden="true" />
      <span className="text-[11px] uppercase tracking-[0.28em] text-[var(--apricot)] font-medium">
        {children}
      </span>
    </div>
  )
}

function SectionHeading({
  lead, accent, sub, align = 'left',
}: { lead: string; accent?: string; sub?: string; align?: 'left' | 'center' }) {
  return (
    <div className={align === 'center' ? 'text-center max-w-2xl mx-auto' : 'max-w-2xl'}>
      <h2
        className="text-4xl md:text-5xl lg:text-[3.4rem] font-semibold leading-[1.04] tracking-[-0.03em]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        <span className="text-gradient-soft">{lead}</span>
        {accent && (
          <>
            {' '}
            <span style={{ fontFamily: 'var(--font-serif)' }} className="italic font-normal text-[var(--apricot)]">
              {accent}
            </span>
          </>
        )}
      </h2>
      {sub && <p className="text-zinc-400 text-base md:text-lg leading-relaxed mt-5">{sub}</p>}
    </div>
  )
}

function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const reduceMotion = usePrefersReducedMotion()
  const shown = reduceMotion ? to : val

  useEffect(() => {
    if (!inView || reduceMotion) return
    let raf = 0
    const DURATION = 1500
    const startedAt = performance.now()
    function tick(now: number) {
      const t = Math.min(1, (now - startedAt) / DURATION)
      setVal(Math.round(to * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, reduceMotion])

  return <span ref={ref}>{shown.toLocaleString()}{suffix}</span>
}

/** Cursor-tracked tilt, used on the bento cards. */
function Tilt({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduceMotion = usePrefersReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rx = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { stiffness: 170, damping: 18 })
  const ry = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { stiffness: 170, damping: 18 })

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduceMotion) return
    const r = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - r.left) / r.width - 0.5)
    y.set((e.clientY - r.top) / r.height - 0.5)
  }

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={() => { x.set(0); y.set(0) }}
      style={reduceMotion ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 1100, transformStyle: 'preserve-3d' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Trust bar — compact, replacing four oversized counter cards
   ═══════════════════════════════════════════════════════════════════════════ */

const TRUST = [
  { value: 56, suffix: '%', label: 'of pets are overweight', note: 'almost always from guessed portions' },
  { value: 70, suffix: '%', label: 'of owners miss a vaccine date', note: 'PetPal keeps the schedule' },
  { value: 89, suffix: '', label: 'foods & plants verified', note: 'with the clinical reason, not a guess' },
  { value: 21, suffix: '', label: 'care guides', note: 'written in one consistent voice' },
]

function TrustBar() {
  return (
    <section className="relative border-y border-white/[0.06] bg-[var(--bg)]/85 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/[0.06]">
        {TRUST.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.07} y={14} className="px-5 py-9 first:pl-0 lg:last:pr-0">
            <div
              className="text-3xl lg:text-4xl font-semibold tabular-nums text-[var(--apricot)] mb-1.5"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <Counter to={s.value} suffix={s.suffix} />
            </div>
            <div className="text-sm text-zinc-200 leading-snug">{s.label}</div>
            <div className="text-[11px] text-zinc-500 mt-1 leading-snug">{s.note}</div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Editorial reveal — a photograph that opens as you scroll past it
   ═══════════════════════════════════════════════════════════════════════════ */

function EditorialReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const reduceMotion = usePrefersReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const clip = useTransform(scrollYProgress, [0, 0.5], ['inset(34% 20% 34% 20% round 2rem)', 'inset(0% 0% 0% 0% round 1.5rem)'])
  const scale = useTransform(scrollYProgress, [0, 0.5], [1.22, 1])
  const imgY = useTransform(scrollYProgress, [0, 1], ['-7%', '7%'])
  const textY = useTransform(scrollYProgress, [0.22, 0.6], [36, 0])
  const textO = useTransform(scrollYProgress, [0.26, 0.55], [0, 1])

  return (
    <section ref={ref} className="relative py-24 px-6">
      <div className="relative max-w-7xl mx-auto h-[78vh] min-h-[500px]">
        <motion.div
          style={reduceMotion ? undefined : { clipPath: clip }}
          className="absolute inset-0 overflow-hidden rounded-[1.5rem] will-change-transform"
        >
          <motion.div style={reduceMotion ? undefined : { scale, y: imgY }} className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1800&h=1100&fit=crop&q=90"
              alt="A person sitting with their dog"
              fill
              className="object-cover"
              sizes="100vw"
              priority
              quality={90}
            />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/25 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg)]/70 to-transparent" />
          <motion.div
            style={reduceMotion ? undefined : { y: textY, opacity: textO }}
            className="absolute inset-0 flex flex-col justify-end p-8 md:p-16"
          >
            <Eyebrow>Why we built it</Eyebrow>
            <h2
              className="text-4xl md:text-6xl lg:text-7xl font-semibold leading-[1.0] max-w-3xl mb-5 tracking-[-0.03em]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              They give you their{' '}
              <span style={{ fontFamily: 'var(--font-serif)' }} className="italic font-normal text-[var(--apricot)]">
                whole
              </span>{' '}
              world.
            </h2>
            <p className="text-lg md:text-xl text-zinc-200 max-w-xl leading-relaxed">
              The least we can do is get their food right, keep them away from what hurts them, and know where the
              nearest vet is before we need one.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Bento — asymmetric, photographic, every cell links somewhere real
   ═══════════════════════════════════════════════════════════════════════════ */

interface Cell {
  title: string
  desc: string
  icon: typeof Apple
  href: string
  span: string
  img?: string
  tall?: boolean
}

const CELLS: Cell[] = [
  {
    title: 'Feed them exactly right',
    desc: 'Species, weight, life stage, activity and body condition in — an exact daily calorie target, food weight and meal schedule out. The same energy formulas a vet uses.',
    icon: Apple, href: '/nutrition', span: 'lg:col-span-7',
    img: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=1200&h=760&fit=crop&q=88',
  },
  {
    title: 'Know what’s safe',
    desc: '89 foods, plants and household items — each with the clinical reason and what to actually do about it.',
    icon: ShieldCheck, href: '/food-safety', span: 'lg:col-span-5', tall: true,
    img: 'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=900&h=1000&fit=crop&q=88',
  },
  {
    title: 'Help, nearby',
    desc: 'Real veterinary practices mapped around you, sorted by distance.',
    icon: MapPin, href: '/vet-finder', span: 'lg:col-span-4',
  },
  {
    title: 'A quick health check',
    desc: 'Eight guided questions, one honest score, and what to do about it.',
    icon: Heart, href: '/wellness', span: 'lg:col-span-4',
  },
  {
    title: 'The first four weeks',
    desc: 'A week-by-week plan, with separate puppy and kitten tracks.',
    icon: ClipboardCheck, href: '/care-plan', span: 'lg:col-span-4',
  },
  {
    title: 'Never parent alone',
    desc: 'Wins, worries and advice from owners who are in exactly the same week as you.',
    icon: MessageSquare, href: '/wall', span: 'lg:col-span-7',
    img: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=1200&h=700&fit=crop&q=88',
  },
  {
    title: 'Nothing slips',
    desc: 'Vaccines, weight, medication and vet visits, all on one timeline.',
    icon: Activity, href: '/dashboard', span: 'lg:col-span-5',
  },
]

function BentoCard({ cell, index }: { cell: Cell; index: number }) {
  const Icon = cell.icon
  return (
    <Reveal delay={Math.min(index * 0.06, 0.3)} className={cell.span}>
      <Tilt className="group h-full">
        <Link
          href={cell.href}
          className={`relative flex flex-col h-full overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[var(--card)]/92 backdrop-blur-xl transition-all duration-500 hover:border-[var(--apricot)]/35 hover:shadow-[0_24px_70px_-24px_rgba(255,174,109,0.3)] ${
            cell.tall ? 'min-h-[420px]' : 'min-h-[260px]'
          }`}
        >
          {cell.img && (
            <div className={`relative w-full overflow-hidden ${cell.tall ? 'h-[230px]' : 'h-[170px]'}`}>
              <Image
                src={cell.img}
                alt=""
                fill
                className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
                sizes="(max-width: 1024px) 100vw, 50vw"
                quality={88}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--card)] via-[var(--card)]/25 to-transparent" />
            </div>
          )}

          <div className="relative flex-1 p-7 flex flex-col" style={{ transform: 'translateZ(30px)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--apricot)]/12 border border-[var(--apricot)]/22 shrink-0">
                <Icon className="w-[18px] h-[18px] text-[var(--apricot)]" aria-hidden="true" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-600 ml-auto transition-all duration-300 group-hover:text-[var(--apricot)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <h3
              className="text-xl lg:text-[1.4rem] font-semibold mb-2.5 tracking-[-0.02em] leading-snug"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {cell.title}
            </h3>
            <p className="text-[14.5px] text-zinc-400 leading-relaxed">{cell.desc}</p>
          </div>

          {/* Warm bloom that lifts on hover */}
          <div
            className="pointer-events-none absolute -bottom-24 -right-16 w-64 h-64 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
            style={{ background: 'radial-gradient(circle, rgba(255,174,109,0.18), transparent 70%)' }}
            aria-hidden="true"
          />
        </Link>
      </Tilt>
    </Reveal>
  )
}

function Bento() {
  return (
    <section className="relative py-28 lg:py-36 px-6">
      <div className="max-w-7xl mx-auto">
        <Reveal className="mb-14">
          <Eyebrow>The platform</Eyebrow>
          <SectionHeading
            lead="One app for every"
            accent="wag, purr and paw."
            sub="Seven tools covering the parts of pet care people actually get wrong — portions, poisons, paperwork and panic."
          />
        </Reveal>

        <div className="grid lg:grid-cols-12 gap-4 lg:gap-5">
          {CELLS.map((c, i) => <BentoCard key={c.title} cell={c} index={i} />)}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Live nutrition demo — the strongest proof on the page, so it gets room
   ═══════════════════════════════════════════════════════════════════════════ */

function NutritionDemo() {
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog')
  const [weight, setWeight] = useState(12)
  const [activity, setActivity] = useState(1.6)
  const [lifeStage, setLifeStage] = useState<LifeStage>('adult')

  // Shared with the full planner (lib/nutrition.ts) so the two can never quote
  // different numbers for the same pet.
  const plan = computePlan({ species, weightKg: weight, activity, lifeStage })
  const maxKg = SPECIES_CFG[species].maxKg

  const pill = (active: boolean) =>
    `px-3 py-2 rounded-xl border text-xs transition-all duration-200 ${
      active
        ? 'bg-[var(--apricot)]/15 border-[var(--apricot)]/40 text-[var(--apricot)]'
        : 'bg-white/[0.03] border-white/[0.08] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
    }`

  return (
    <div className="grid sm:grid-cols-2 gap-6">
      <div className="space-y-5">
        <div>
          <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.2em] block mb-2.5">Species</label>
          <div className="grid grid-cols-2 gap-2">
            {([['dog', 'Dog', Dog], ['cat', 'Cat', Cat]] as const).map(([k, label, Icon]) => (
              <button
                key={k}
                onClick={() => { setSpecies(k); setWeight(w => Math.min(w, SPECIES_CFG[k].maxKg)) }}
                aria-pressed={species === k}
                className={`${pill(species === k)} flex items-center justify-center gap-2 py-2.5`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2.5">
            <label htmlFor="demo-weight" className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Weight</label>
            <span className="font-mono text-sm text-[var(--apricot)] font-semibold tabular-nums">{Math.min(weight, maxKg)} kg</span>
          </div>
          <input
            id="demo-weight" type="range" min={1} max={maxKg}
            value={Math.min(weight, maxKg)}
            onChange={e => setWeight(+e.target.value)}
            className="w-full accent-[var(--apricot)]"
          />
        </div>

        <div>
          <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.2em] block mb-2.5">Life stage</label>
          <div className="grid grid-cols-3 gap-2">
            {(['young', 'adult', 'senior'] as const).map(s => (
              <button key={s} onClick={() => setLifeStage(s)} aria-pressed={lifeStage === s} className={`${pill(lifeStage === s)} capitalize`}>
                {s === 'young' ? SPECIES_CFG[species].youngLabel : s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.2em] block mb-2.5">Activity</label>
          <div className="grid grid-cols-3 gap-2">
            {([['Low', 1.3], ['Normal', 1.6], ['High', 2.0]] as const).map(([label, f]) => (
              <button key={label} onClick={() => setActivity(f)} aria-pressed={activity === f} className={pill(activity === f)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl p-6 border border-[var(--apricot)]/25 bg-[var(--apricot)]/[0.06]">
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-2">Daily energy</div>
          <div className="flex items-end gap-2">
            <span
              className="text-[3.4rem] leading-none font-semibold tabular-nums text-[var(--apricot)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {plan.mer}
            </span>
            <span className="text-zinc-500 mb-2 text-sm">kcal / day</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Dry food', v: `${plan.dryGrams}g`, sub: `≈ ${plan.cups} cups` },
            { label: 'Meals', v: `${plan.meals}×`, sub: `≈ ${plan.gramsPerMeal}g each` },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 border border-white/[0.08] bg-white/[0.02]">
              <div className="text-xs text-zinc-500 mb-1">{s.label}</div>
              <div className="text-2xl font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{s.v}</div>
              <div className="text-[11px] text-zinc-500">{s.sub}</div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-zinc-600 leading-relaxed">
          RER/MER energy formulas. Guidance, not a prescription — confirm medical diets with your vet.
        </p>
      </div>
    </div>
  )
}

function NutritionSection() {
  return (
    <section className="relative py-28 lg:py-36 px-6 border-y border-white/[0.06]">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 lg:gap-20 items-start">
        <Reveal>
          <Eyebrow>Try it now</Eyebrow>
          <SectionHeading
            lead="Portion size is the"
            accent="quiet problem."
            sub="Over half of pets are overweight, and it almost never comes from cruelty — it comes from a scoop nobody ever measured. Move the sliders and see what your pet actually needs."
          />
          <ul className="space-y-3 mt-9 mb-10">
            {[
              'Vet-grade RER/MER calorie maths',
              'Adjusts for species, life stage, activity and body condition',
              'Exact grams, cups, meals and water per day',
              'Recalculates as they grow or slim down',
            ].map(t => (
              <li key={t} className="flex items-start gap-3 text-[14.5px] text-zinc-300">
                <CheckCircle2 className="w-[18px] h-[18px] text-[var(--apricot)] shrink-0 mt-0.5" aria-hidden="true" /> {t}
              </li>
            ))}
          </ul>
          <Link href="/nutrition">
            <Button size="lg" className="btn-glass-primary gap-2 rounded-2xl px-7">
              Open the full planner <ArrowUpRight className="w-4 h-4" />
            </Button>
          </Link>
        </Reveal>

        <Reveal delay={0.12} className="lg:sticky lg:top-28">
          <div className="relative p-7 rounded-[1.5rem] border border-white/[0.09] bg-[var(--card)]/94 backdrop-blur-xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">Live calculation</span>
              <span className="flex items-center gap-1.5 text-[10px] text-[var(--apricot)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--apricot)] animate-pulse" /> updating
              </span>
            </div>
            <NutritionDemo />
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Testimonials — one large editorial quote rather than three equal cards
   ═══════════════════════════════════════════════════════════════════════════ */

const VOICES = [
  {
    quote: 'The portion planner alone fixed Biscuit’s weight in two months. I had been overfeeding him for a year without realising it.',
    name: 'Amara Okonkwo', role: 'Mum to Biscuit, a beagle',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&q=85',
    metric: '−18%', metricLabel: 'to a healthy weight',
  },
  {
    quote: 'Luna got something off the counter at 11pm. The food checker told me it was toxic and the vet finder had a clinic open four minutes away.',
    name: 'Thabo Mokoena', role: 'Dad to Luna, a Maine Coon',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&q=85',
    metric: '4 min', metricLabel: 'to an open clinic',
  },
  {
    quote: 'Two dogs, endless vaccine dates, two different diets. PetPal keeps all of it straight so I don’t have to hold it in my head.',
    name: 'Lerato Dube', role: 'Mum to Max & Milo, huskies',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&q=85',
    metric: '100%', metricLabel: 'reminders kept',
  },
]

function Testimonials() {
  const [active, setActive] = useState(0)
  const v = VOICES[active]

  return (
    <section className="relative py-28 lg:py-36 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal className="mb-12">
          <Eyebrow>Happy tails</Eyebrow>
          <SectionHeading lead="Owners who" accent="rest easier." />
        </Reveal>

        <Reveal delay={0.1}>
          <div className="relative rounded-[1.75rem] border border-white/[0.08] bg-[var(--card)]/88 backdrop-blur-xl p-8 md:p-14 overflow-hidden">
            <div
              className="pointer-events-none absolute -top-32 -right-20 w-[26rem] h-[26rem] rounded-full opacity-30"
              style={{ background: 'radial-gradient(circle, rgba(255,174,109,0.22), transparent 70%)' }}
              aria-hidden="true"
            />

            <AnimatePresence mode="wait">
              <motion.blockquote
                key={active}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45, ease: EASE }}
                className="relative"
              >
                <p
                  className="text-2xl md:text-[2.1rem] leading-[1.35] tracking-[-0.02em] text-zinc-100 max-w-3xl"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  &ldquo;{v.quote}&rdquo;
                </p>

                <div className="flex flex-wrap items-center gap-6 mt-10">
                  <div className="flex items-center gap-3.5">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/12 shrink-0">
                      <Image src={v.avatar} alt="" fill className="object-cover" sizes="48px" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{v.name}</div>
                      <div className="text-xs text-zinc-500">{v.role}</div>
                    </div>
                  </div>
                  <div className="h-10 w-px bg-white/10 hidden sm:block" aria-hidden="true" />
                  <div>
                    <div
                      className="text-2xl font-semibold tabular-nums text-[var(--apricot)] leading-none"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {v.metric}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1">{v.metricLabel}</div>
                  </div>
                </div>
              </motion.blockquote>
            </AnimatePresence>

            <div className="flex items-center gap-2 mt-12" role="tablist" aria-label="Testimonials">
              {VOICES.map((t, i) => (
                <button
                  key={t.name}
                  role="tab"
                  aria-selected={i === active}
                  aria-label={`Read ${t.name}'s story`}
                  onClick={() => setActive(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === active ? 'w-10 bg-[var(--apricot)]' : 'w-1.5 bg-white/15 hover:bg-white/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   FAQ — two quiet columns, no boxes inside boxes
   ═══════════════════════════════════════════════════════════════════════════ */

const FAQS = [
  { q: 'Is PetPal free?', a: 'Yes. Pet profiles, the nutrition planner, food-safety checker, wellness check, care plan, guides and vet finder are all free — and most of them work without an account at all.' },
  { q: 'How accurate is the nutrition planner?', a: 'It uses the standard veterinary RER and MER energy equations, adjusted for species, life stage, activity and body condition. It is planning guidance — prescription and therapeutic diets are always your vet’s call.' },
  { q: 'How does the food-safety checker work?', a: 'A curated database of 89 foods, plants and household items, each with the clinical reason, the animals most affected, and what to do. If an item has not been verified we say so rather than guessing, because a wrong “safe” could kill an animal.' },
  { q: 'Where do the vets come from?', a: 'Real practices recorded in OpenStreetMap, ranked by distance from you. We show only what the directory actually holds — no invented ratings, and a phone number only where one is verified.' },
  { q: 'What happens to my location?', a: 'Your browser shares an approximate position with your permission, it is used to run one search, and it is never stored or sent to us.' },
  { q: 'Can I track more than one pet?', a: 'As many as you like. Each gets its own profile, diet, weight and schedule — and only you can see them, which is enforced by the database itself, not just by the app.' },
]

function FaqRow({ q, a, idx }: { q: string; a: string; idx: number }) {
  const [open, setOpen] = useState(idx === 0)
  return (
    <div className="border-b border-white/[0.07]">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-start justify-between gap-6 py-6 text-left group"
      >
        <span className="text-[15.5px] font-medium text-zinc-100 group-hover:text-white transition-colors leading-snug">
          {q}
        </span>
        <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full border border-white/12 flex items-center justify-center text-zinc-400 group-hover:border-[var(--apricot)]/40 group-hover:text-[var(--apricot)] transition-colors">
          {open ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="pb-6 pr-10 text-sm text-zinc-400 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Faq() {
  const mid = Math.ceil(FAQS.length / 2)
  return (
    <section className="relative py-28 lg:py-36 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal className="mb-12">
          <Eyebrow>Questions</Eyebrow>
          <SectionHeading lead="Good questions," accent="honest answers." />
        </Reveal>
        <Reveal delay={0.1}>
          <div className="grid md:grid-cols-2 gap-x-14">
            <div>{FAQS.slice(0, mid).map((f, i) => <FaqRow key={f.q} {...f} idx={i} />)}</div>
            <div>{FAQS.slice(mid).map((f, i) => <FaqRow key={f.q} {...f} idx={i + mid} />)}</div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Close
   ═══════════════════════════════════════════════════════════════════════════ */

function ClosingCta() {
  return (
    <section className="relative py-28 lg:py-36 px-6">
      <Reveal>
        <div className="relative max-w-4xl mx-auto text-center px-6 py-16 md:py-20 rounded-[2rem] border border-white/[0.09] bg-[var(--card)]/88 backdrop-blur-xl overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{ background: 'radial-gradient(60% 60% at 50% 0%, rgba(255,174,109,0.16), transparent 70%)' }}
            aria-hidden="true"
          />
          <div className="relative">
            <div className="flex justify-center mb-8">
              <Logo size={64} glow />
            </div>
            <h2
              className="text-4xl md:text-6xl font-semibold mb-5 leading-[1.05] tracking-[-0.03em]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <span className="text-gradient-soft">They give you everything.</span>
              <br />
              <span style={{ fontFamily: 'var(--font-serif)' }} className="italic font-normal text-[var(--apricot)]">
                Give them this.
              </span>
            </h2>
            <p className="text-zinc-400 text-base md:text-lg max-w-md mx-auto mb-9 leading-relaxed">
              Set up a profile in under a minute. Free, for every pet you love.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/auth/signup">
                <Button size="lg" className="btn-glass-primary gap-2 rounded-2xl px-8 py-6 text-base w-full sm:w-auto">
                  Add Your Pet <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/food-safety">
                <Button size="lg" className="btn-glass text-white gap-2 rounded-2xl px-8 py-6 text-base w-full sm:w-auto">
                  Check a food first <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

function Footer() {
  const cols = [
    { title: 'Tools', links: [['Nutrition Planner', '/nutrition'], ['Food Safety', '/food-safety'], ['Find a Vet', '/vet-finder'], ['Wellness Check', '/wellness'], ['Care Plan', '/care-plan'], ['Care Guides', '/resources']] },
    { title: 'Account', links: [['Sign In', '/auth/login'], ['Create Account', '/auth/signup'], ['Dashboard', '/dashboard'], ['Setup Check', '/setup']] },
  ]
  return (
    <footer className="border-t border-white/[0.07] py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <Logo size={34} />
              <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                Pet<span className="text-[var(--apricot)]">Pal</span>
              </span>
            </Link>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
              Feeding, safety, health and vets — for dogs, cats, rabbits, birds, reptiles and every small creature in
              between.
            </p>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 mb-4">{col.title}</h3>
              <ul className="space-y-2.5 text-sm text-zinc-400">
                {col.links.map(([l, h]) => (
                  <li key={l}>
                    <Link href={h} className="hover:text-white transition-colors">{l}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>&copy; 2026 PetPal · Made for the ones who never let you down.</p>
          <p className="text-zinc-600">Guidance only — never a substitute for your vet.</p>
        </div>
      </div>
    </footer>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  return (
    <div className="relative min-h-screen text-zinc-100 overflow-x-hidden">
      {/* Fixed 3D layer behind every section — morphs dog → cat → bird →
          rabbit → fish across the length of the page. */}
      <AnimalField />

      <div className="relative z-10">
        <Navbar />
        <Hero />
        <TrustBar />
        <EditorialReveal />
        <Bento />
        <NutritionSection />
        <Testimonials />
        <Faq />
        <ClosingCta />
        <Footer />
      </div>
    </div>
  )
}

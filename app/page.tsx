'use client'

import { motion, useScroll, useTransform, AnimatePresence, useInView, useSpring, useMotionValue } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowUpRight, ChevronLeft, ChevronRight, PawPrint, Apple,
  ShieldCheck, Heart, Stethoscope, MapPin, MessageSquare,
  ClipboardCheck, CheckCircle2, Quote, Plus,
  Cat, Dog, Activity, Bell, Syringe, Scale
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Navbar from '@/components/public/Navbar'
import Logo from '@/components/public/Logo'
import Hero from '@/components/public/Hero'
import AnimalField from '@/components/public/AnimalField'
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid
} from 'recharts'
import { computePlan, SPECIES_CFG, type LifeStage } from '@/lib/nutrition'
import { usePrefersReducedMotion } from '@/lib/use-client-value'

// ─────────── Data ───────────
const STATS = [
  { value: 38, suffix: 'M+', label: 'households own a pet', sub: 'And counting', icon: Dog },
  { value: 56, suffix: '%', label: 'of pets are overweight', sub: 'Mostly from wrong portions', icon: Scale },
  { value: 70, suffix: '%', label: 'of owners miss vaccine dates', sub: 'PetPal reminds you', icon: Syringe },
  { value: 24, suffix: '/7', label: 'food-safety & symptom help', sub: 'Whenever you need it', icon: ShieldCheck },
]

const FEATURES_BENTO = [
  { title: 'Nutrition & Portion Planner', desc: 'Tell us your pet’s species, breed, weight and activity — get an exact daily food plan, calorie target, and feeding schedule.', icon: Apple, span: 'lg:col-span-2', tag: 'Smart' },
  { title: 'Food Safety Checker', desc: 'Is it safe to feed? Instantly check any food or plant.', icon: ShieldCheck, span: '', tag: 'Lifesaver' },
  { title: 'Find a Vet', desc: 'A live map of trusted vets near your location.', icon: MapPin, span: '', tag: 'Live Map' },
  { title: 'Pet Wellness Check', desc: 'A quick guided check-up of your pet’s health, weight, mood and routine — with a personalised wellbeing score.', icon: Heart, span: 'lg:col-span-2', tag: 'Quiz' },
  { title: 'New Pet Care Plan', desc: 'A gentle week-by-week roadmap for your new puppy or kitten.', icon: ClipboardCheck, span: '', tag: 'Roadmap' },
  { title: 'Health Records & Reminders', desc: 'Vaccines, weight, meds and vet visits — tracked and never forgotten.', icon: Activity, span: '', tag: 'Tracking' },
  { title: 'Owner Community', desc: 'Swap stories, photos and advice with pet owners who get it.', icon: MessageSquare, span: 'lg:col-span-2', tag: 'Community' },
]

const TESTIMONIALS = [
  { name: 'Amara Okonkwo', role: 'Mum to Biscuit (Beagle)', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop', quote: 'The portion planner alone fixed Biscuit’s weight in two months. I had been overfeeding him for a year without realising.', metricLabel: 'Weight to healthy', metric: '−18%' },
  { name: 'Thabo Mokoena', role: 'Dad to Luna (Maine Coon)', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop', quote: 'Luna ate something off the counter at 11pm. The food checker told me it was toxic and the vet finder had an emergency clinic open. PetPal saved her life.', metricLabel: 'Emergency vet found', metric: '4 min' },
  { name: 'Lerato Dube', role: 'Mum to Max & Milo (Huskies)', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop', quote: 'Two dogs, endless vaccine dates, two diets. PetPal keeps all of it straight. I finally feel like a good pet parent.', metricLabel: 'Reminders kept', metric: '100%' },
]

const FAQS = [
  { q: 'Is PetPal free?', a: 'Yes — creating pet profiles, the nutrition planner, food-safety checker, wellness check and vet finder are all free for pet owners. Forever.' },
  { q: 'How accurate is the nutrition planner?', a: 'It uses veterinary RER/MER energy formulas (Resting and Maintenance Energy Requirements) based on your pet’s weight, species, life stage and activity level. It is guidance, not a substitute for your vet’s advice.' },
  { q: 'How does the food-safety checker work?', a: 'We maintain a curated database of foods, plants and household items that are unsafe for pets — with the clinical reason, which animals it affects most, and exactly what to do. If we haven’t verified an item we say so rather than guessing, because a wrong “safe” is worse than no answer.' },
  { q: 'How does Find a Vet know where I am?', a: 'With your permission, your browser shares your approximate location so we can show vets near you on the map. We never store your location.' },
  { q: 'Can I track more than one pet?', a: 'Absolutely. Add as many pets as you like — each with their own profile, diet, weight history, vaccine schedule and reminders.' },
]

const SPECIES_TICKER = [
  'Dogs', 'Cats', 'Rabbits', 'Birds', 'Hamsters', 'Guinea Pigs',
  'Ferrets', 'Reptiles', 'Fish', 'Horses', 'Tortoises', 'Parrots',
]

const TREND_DATA = [
  { week: 'Mon', weight: 32.1 }, { week: 'Tue', weight: 31.8 },
  { week: 'Wed', weight: 31.9 }, { week: 'Thu', weight: 31.5 },
  { week: 'Fri', weight: 31.2 }, { week: 'Sat', weight: 31.0 },
  { week: 'Sun', weight: 30.7 },
]

// ─────────── Animated Counter ───────────
// 3D tilt-on-hover wrapper that tracks the cursor
function Tilt({ children, className }: { children: React.ReactNode; className?: string }) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rx = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 180, damping: 16 })
  const ry = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 180, damping: 16 })
  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - r.left) / r.width - 0.5)
    y.set((e.clientY - r.top) / r.height - 0.5)
  }
  function reset() { x.set(0); y.set(0) }
  return (
    <motion.div
      onMouseMove={onMove} onMouseLeave={reset}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900, transformStyle: 'preserve-3d' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function Counter({ to, suffix = '', prefix = '' }: { to: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const reduceMotion = usePrefersReducedMotion()

  // Anyone who has asked for less motion just sees the final number.
  const shown = reduceMotion ? to : val

  useEffect(() => {
    if (!inView || reduceMotion) return

    let raf = 0
    const DURATION = 1600
    const startedAt = performance.now()

    function tick(now: number) {
      const t = Math.min(1, (now - startedAt) / DURATION)
      // easeOutCubic — fast start, gentle settle.
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(to * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, reduceMotion])

  return <span ref={ref}>{prefix}{shown.toLocaleString()}{suffix}</span>
}

// ─────────── Nutrition Planner (inline live demo) ───────────
function NutritionDemo() {
  const [species, setSpecies] = useState<'dog' | 'cat'>('dog')
  const [weight, setWeight] = useState(12)
  const [activity, setActivity] = useState(1.6)
  const [lifeStage, setLifeStage] = useState<LifeStage>('adult')

  // Shared with the full planner (lib/nutrition.ts). These two screens used to
  // carry separate copies of the maths and quoted different calorie targets for
  // the same pet.
  const plan = computePlan({ species, weightKg: weight, activity, lifeStage })
  const { mer, dryGrams: grams, cups, meals } = plan
  const maxKg = SPECIES_CFG[species].maxKg

  return (
    <div className="grid sm:grid-cols-2 gap-5">
      <div className="space-y-5">
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Species</label>
          <div className="grid grid-cols-2 gap-2">
            {([['dog', 'Dog', Dog], ['cat', 'Cat', Cat]] as const).map(([k, label, Icon]) => (
              <button key={k} onClick={() => { setSpecies(k); setWeight(w => Math.min(w, SPECIES_CFG[k].maxKg)) }} aria-pressed={species === k}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all ${species === k ? 'bg-[#FFAE6D]/15 border-[#FFAE6D]/40 text-[#FFAE6D]' : 'bg-white/[0.03] border-white/8 text-zinc-400 hover:border-white/20'}`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Weight</label>
            <span className="font-mono text-sm text-[#FFAE6D] font-semibold">{weight} kg</span>
          </div>
          <input type="range" min={1} max={maxKg} value={Math.min(weight, maxKg)} onChange={e => setWeight(+e.target.value)} className="w-full accent-[#FFAE6D]" aria-label="Weight" />
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Life stage</label>
          <div className="grid grid-cols-3 gap-2">
            {(['young', 'adult', 'senior'] as const).map(s => (
              <button key={s} onClick={() => setLifeStage(s)} aria-pressed={lifeStage === s}
                className={`px-2 py-2 rounded-xl border text-xs capitalize transition-all ${lifeStage === s ? 'bg-[#FFAE6D]/15 border-[#FFAE6D]/40 text-[#FFAE6D]' : 'bg-white/[0.03] border-white/8 text-zinc-400 hover:border-white/20'}`}>
                {s === 'young' ? SPECIES_CFG[species].youngLabel : s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Activity</label>
          <div className="grid grid-cols-3 gap-2">
            {([['Low', 1.3], ['Normal', 1.6], ['High', 2.0]] as const).map(([label, f]) => (
              <button key={label} onClick={() => setActivity(f)} aria-pressed={activity === f}
                className={`px-2 py-2 rounded-xl border text-xs transition-all ${activity === f ? 'bg-[#FFAE6D]/15 border-[#FFAE6D]/40 text-[#FFAE6D]' : 'bg-white/[0.03] border-white/8 text-zinc-400 hover:border-white/20'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="glass-card rounded-2xl p-5" style={{ borderColor: 'rgba(255,174,109,0.3)' }}>
          <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-1">Daily calories</div>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-semibold tabular-nums text-[#FFAE6D]" style={{ fontFamily: 'var(--font-display)' }}>{mer}</span>
            <span className="text-zinc-500 mb-2 text-sm">kcal / day</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card rounded-2xl p-4">
            <div className="text-xs text-zinc-400 mb-1">Dry food</div>
            <div className="text-2xl font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{grams}g</div>
            <div className="text-[11px] text-zinc-500">≈ {cups} cups</div>
          </div>
          <div className="glass-card rounded-2xl p-4">
            <div className="text-xs text-zinc-400 mb-1">Meals / day</div>
            <div className="text-2xl font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{meals}</div>
            <div className="text-[11px] text-zinc-500">≈ {Math.round(grams / meals)}g each</div>
          </div>
        </div>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Based on veterinary RER/MER energy formulas. Always confirm with your vet for medical diets.
        </p>
      </div>
    </div>
  )
}

function TestimonialCard({ t }: { t: typeof TESTIMONIALS[number] }) {
  return (
    <div className="glass-card rounded-2xl p-6 surface-hover h-full flex flex-col">
      <Quote className="w-7 h-7 text-[#FFAE6D]/40 mb-4" />
      <p className="text-zinc-300 leading-relaxed mb-6 flex-1">&ldquo;{t.quote}&rdquo;</p>
      <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-xl bg-[#FFAE6D]/10 border border-[#FFAE6D]/20 mb-5">
        <span className="text-2xl font-semibold tabular-nums text-[#FFAE6D]" style={{ fontFamily: 'var(--font-display)' }}>{t.metric}</span>
        <span className="text-[11px] text-zinc-400 leading-tight">{t.metricLabel}</span>
      </div>
      <div className="flex items-center gap-3 pt-4 border-t border-white/5">
        <div className="relative w-11 h-11 rounded-full overflow-hidden border border-white/10">
          <Image src={t.avatar} alt={t.name} fill className="object-cover" sizes="44px" />
        </div>
        <div>
          <div className="font-semibold text-sm">{t.name}</div>
          <div className="text-xs text-zinc-400">{t.role}</div>
        </div>
      </div>
    </div>
  )
}

function FaqItem({ q, a, idx }: { q: string; a: string; idx: number }) {
  const [open, setOpen] = useState(idx === 0)
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.04 }}
      className="glass-card rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors" aria-expanded={open}>
        <span className="font-semibold text-sm">{q}</span>
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.3 }}><Plus className="w-4 h-4 text-zinc-400" /></motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
            <div className="px-5 pb-5 text-sm text-zinc-400 leading-relaxed">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ═══════════ Immersive Reveal — emotional scroll band ═══════════
function ImmersiveReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const clip = useTransform(scrollYProgress, [0, 0.5, 1], ['inset(38% 22% 38% 22% round 2.5rem)', 'inset(0% 0% 0% 0% round 1.25rem)', 'inset(0% 0% 0% 0% round 1.25rem)'])
  const scale = useTransform(scrollYProgress, [0, 0.5], [1.25, 1])
  const imgY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%'])
  const textY = useTransform(scrollYProgress, [0.2, 0.6], [40, 0])
  const textO = useTransform(scrollYProgress, [0.25, 0.55], [0, 1])

  return (
    <section ref={ref} className="relative py-20 px-6">
      <div className="relative max-w-7xl mx-auto h-[80vh] min-h-[520px]">
        <motion.div style={{ clipPath: clip }} className="absolute inset-0 overflow-hidden will-change-transform">
          <motion.div style={{ scale, y: imgY }} className="absolute inset-0">
            <Image src="https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1600&h=1000&fit=crop" alt="A person and their dog" fill className="object-cover" sizes="100vw" priority />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0A14] via-[#0D0A14]/30 to-[#0D0A14]/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0D0A14]/60 to-transparent" />
          <motion.div style={{ y: textY, opacity: textO }} className="absolute inset-0 flex flex-col justify-end p-8 md:p-16">
            <p className="text-xs uppercase tracking-[0.3em] text-[#FFAE6D] mb-5">Why we built PetPal</p>
            <h2 className="text-4xl md:text-7xl font-semibold leading-[1.0] max-w-3xl mb-5" style={{ fontFamily: 'var(--font-display)' }}>
              They give you their <span style={{ fontFamily: 'var(--font-serif)' }} className="italic text-[#FFAE6D]">whole</span> world.
            </h2>
            <p className="text-lg md:text-xl text-zinc-200 max-w-xl leading-relaxed">
              The least we can do is make sure they&rsquo;re fed right, kept safe, and never one tap away from help.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

// ═══════════ 3D Coverflow Slider — five ways PetPal has your back ═══════════
const SHOWCASE = [
  { tag: 'Nutrition', title: 'Feed them exactly right', desc: 'Precise calories, grams and meals — calculated like a vet would.', img: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=900&h=1100&fit=crop', href: '/nutrition' },
  { tag: 'Safety', title: 'Know what’s safe', desc: 'Check any food or plant against our toxicity database in a tap.', img: 'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=900&h=1100&fit=crop', href: '/food-safety' },
  { tag: 'Vets', title: 'Help, right nearby', desc: 'A live map of trusted vets the moment you need one.', img: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=900&h=1100&fit=crop', href: '/vet-finder' },
  { tag: 'Wellness', title: 'A happier, healthier pet', desc: 'Track weight, mood and milestones — and never miss a date.', img: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=900&h=1100&fit=crop', href: '/wellness' },
  { tag: 'Community', title: 'Never parent alone', desc: 'Swap stories and advice with thousands of fellow pet parents.', img: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=900&h=1100&fit=crop', href: '/wall' },
]

function Slider3D() {
  const [active, setActive] = useState(0)
  const [vw, setVw] = useState(1200)
  const n = SHOWCASE.length

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth)
    onResize()
    window.addEventListener('resize', onResize)
    const id = setInterval(() => setActive(a => (a + 1) % n), 4500)
    return () => { clearInterval(id); window.removeEventListener('resize', onResize) }
  }, [n])

  const isMobile = vw < 640
  const spread = isMobile ? 140 : 280

  function offsetOf(i: number) {
    let d = i - active
    if (d > n / 2) d -= n
    if (d < -n / 2) d += n
    return d
  }

  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 bg-mesh-soft" aria-hidden="true" />
      <div className="relative max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <Badge className="mb-5 bg-[#FFAE6D]/10 text-[#FFAE6D] border-[#FFAE6D]/30 font-mono"><PawPrint className="w-3 h-3 mr-1.5" /> HOW IT HELPS</Badge>
          <h2 className="text-4xl md:text-6xl font-semibold leading-[1.05]" style={{ fontFamily: 'var(--font-display)' }}>
            <span className="text-gradient-soft">Five ways PetPal</span> <span className="text-gradient-aurora">has your back.</span>
          </h2>
        </motion.div>

        {/* 3D stage */}
        <div className="relative h-[460px] sm:h-[560px] [perspective:1800px]" aria-roledescription="carousel">
          <div className="absolute inset-0 [transform-style:preserve-3d]">
            {SHOWCASE.map((s, i) => {
              const off = offsetOf(i)
              const abs = Math.abs(off)
              const isCenter = off === 0
              return (
                <motion.div
                  key={i}
                  className="absolute top-1/2 left-1/2 w-[260px] h-[380px] sm:w-[340px] sm:h-[460px] -ml-[130px] -mt-[190px] sm:-ml-[170px] sm:-mt-[230px] rounded-[2rem] overflow-hidden border border-white/10 cursor-pointer"
                  animate={{
                    x: off * spread,
                    scale: isCenter ? 1 : 0.82 - abs * 0.05,
                    rotateY: off * -32,
                    z: -abs * 240,
                    opacity: abs > 2 ? 0 : 1 - abs * 0.18,
                    zIndex: 20 - abs,
                    filter: isCenter ? 'brightness(1)' : 'brightness(0.55)',
                  }}
                  transition={{ type: 'spring', stiffness: 110, damping: 20 }}
                  onClick={() => setActive(i)}
                  style={{ pointerEvents: abs > 2 ? 'none' : 'auto' }}
                >
                  <Image src={s.img} alt={s.title} fill className="object-cover" sizes="360px" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0D0A14] via-[#0D0A14]/20 to-transparent" />
                  <div className="absolute top-5 left-6 text-5xl font-semibold text-white/15 tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>0{i + 1}</div>
                  <AnimatePresence>
                    {isCenter && (
                      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-0 left-0 right-0 p-7">
                        <Badge className="mb-3 bg-[#FFAE6D]/15 text-[#FFAE6D] border-[#FFAE6D]/30 font-mono text-[10px]">{s.tag}</Badge>
                        <h3 className="text-2xl font-semibold mb-1.5" style={{ fontFamily: 'var(--font-display)' }}>{s.title}</h3>
                        <p className="text-zinc-300 text-sm leading-relaxed mb-4">{s.desc}</p>
                        <Link href={s.href} className="inline-flex items-center gap-1.5 text-sm text-[#FFAE6D] font-medium" onClick={e => e.stopPropagation()}>Explore <ArrowUpRight className="w-4 h-4" /></Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-5 mt-10">
          <button onClick={() => setActive(a => (a - 1 + n) % n)} className="w-11 h-11 rounded-full glass-card flex items-center justify-center hover:border-[#FFAE6D]/40 transition-colors" aria-label="Previous"><ChevronLeft className="w-5 h-5" /></button>
          <div className="flex items-center gap-2">
            {SHOWCASE.map((_, i) => (
              <button key={i} onClick={() => setActive(i)} aria-label={`Go to slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${i === active ? 'w-8 bg-[#FFAE6D]' : 'w-2 bg-white/15 hover:bg-white/30'}`} />
            ))}
          </div>
          <button onClick={() => setActive(a => (a + 1) % n)} className="w-11 h-11 rounded-full glass-card flex items-center justify-center hover:border-[#FFAE6D]/40 transition-colors" aria-label="Next"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>
    </section>
  )
}

// ═══════════ Exploding Stats — burst-to-reveal ═══════════
const EXPLODE = [
  { icon: Apple, label: 'Nutrition plans', value: '2.4M', x: -240, y: -120, c: '#FFAE6D' },
  { icon: ShieldCheck, label: 'Foods checked', value: '890k', x: 240, y: -130, c: '#8E8BF5' },
  { icon: MapPin, label: 'Vets mapped', value: '12k', x: -270, y: 90, c: '#FFD98E' },
  { icon: Heart, label: 'Wellness checks', value: '640k', x: 250, y: 110, c: '#FFAE6D' },
  { icon: Activity, label: 'Weigh-ins logged', value: '5.1M', x: -120, y: 180, c: '#8E8BF5' },
  { icon: Stethoscope, label: 'Vet bookings', value: '210k', x: 130, y: 190, c: '#FFD98E' },
]

function ExplodeStats() {
  // `cycle` increments to remount the chips → reliably re-runs the explosion every tap.
  const [cycle, setCycle] = useState(0)
  const [armed, setArmed] = useState(false)
  const [vw, setVw] = useState(1200)

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const f = vw < 480 ? 0.46 : vw < 768 ? 0.66 : 1 // responsive explosion radius

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-mesh-soft" aria-hidden="true" />
      <div className="relative max-w-5xl mx-auto px-6">
        <motion.div
          onViewportEnter={() => setArmed(true)}
          viewport={{ once: true, amount: 0.4 }}
          className="relative h-[400px] sm:h-[520px] flex items-center justify-center"
        >
          {/* Pulsing rings */}
          <div className="absolute w-32 h-32 sm:w-40 sm:h-40 rounded-full border border-[#FFAE6D]/20 animate-pulse-ring" />
          <div className="absolute w-32 h-32 sm:w-40 sm:h-40 rounded-full border border-[#FFAE6D]/20 animate-pulse-ring" style={{ animationDelay: '0.8s' }} />

          {/* Core paw — click to re-explode */}
          <motion.button
            onClick={() => setCycle(c => c + 1)}
            whileTap={{ scale: 0.9 }}
            animate={{ rotate: cycle * 360 }}
            transition={{ type: 'spring', stiffness: 140, damping: 12 }}
            className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-[1.75rem] bg-gradient-to-br from-[#FFBE8C] to-[#E0682F] flex items-center justify-center shadow-[0_12px_50px_rgba(255,174,109,0.5)] hover:scale-105 transition-transform"
            aria-label="Replay animation"
          >
            <Logo size={vw < 640 ? 52 : 64} />
          </motion.button>

          {/* Exploding info chips — keyed on cycle so each tap replays */}
          {armed && EXPLODE.map((e, i) => (
            <motion.div
              key={`${cycle}-${i}`}
              initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: -25 }}
              animate={{ x: e.x * f, y: e.y * f, scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.05 + i * 0.07 }}
              className="absolute z-20 glass-card rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-2 sm:gap-3 shadow-2xl"
            >
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0" style={{ background: `${e.c}1F`, border: `1px solid ${e.c}40` }}>
                <e.icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" style={{ color: e.c }} />
              </div>
              <div>
                <div className="text-sm sm:text-lg font-semibold tabular-nums leading-none" style={{ fontFamily: 'var(--font-display)' }}>{e.value}</div>
                <div className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5 whitespace-nowrap">{e.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="text-center mt-2 sm:-mt-4">
          <h2 className="text-3xl md:text-5xl font-semibold leading-[1.05]" style={{ fontFamily: 'var(--font-display)' }}>
            <span className="text-gradient-soft">A whole platform,</span> <span className="text-gradient-aurora">working for them.</span>
          </h2>
          <p className="text-zinc-500 text-sm mt-3">Tap the paw to replay</p>
        </div>
      </div>
    </section>
  )
}

// ─────────── MAIN ───────────
export default function LandingPage() {
  return (
    <div className="relative min-h-screen text-zinc-100 overflow-x-hidden">
      {/* Fixed 3D layer behind every section — morphs dog -> cat -> bird ->
          rabbit -> fish across the length of the page. */}
      <AnimalField />
      <div className="relative z-10">
      <Navbar />

      {/* ─── HERO ─── */}
      <Hero />

      {/* ─── STATS ─── */}
      <section className="relative py-24 border-y border-white/5">
        <div className="absolute inset-0 bg-mesh-soft" aria-hidden="true" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {STATS.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }}
                className="glass-card rounded-2xl p-5 surface-hover">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 bg-[#FFAE6D]/12 border border-[#FFAE6D]/20">
                  <s.icon className="w-4 h-4 text-[#FFAE6D]" />
                </div>
                <div className="text-4xl lg:text-5xl font-semibold mb-1 tabular-nums text-[#FFAE6D]" style={{ fontFamily: 'var(--font-display)' }}>
                  <Counter to={s.value} suffix={s.suffix} />
                </div>
                <p className="text-zinc-300 text-sm mb-1">{s.label}</p>
                <p className="text-zinc-500 text-xs">{s.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SPECIES TICKER ─── */}
      <div className="border-b border-white/5 py-5 overflow-hidden bg-[#130F1C]">
        <div className="animate-marquee-x">
          {[...SPECIES_TICKER, ...SPECIES_TICKER].map((s, i) => (
            <div key={i} className="mx-6 flex items-center gap-2 whitespace-nowrap text-sm text-zinc-400">
              <PawPrint className="w-3.5 h-3.5 text-[#FFAE6D]" /> {s}
            </div>
          ))}
        </div>
      </div>

      {/* ─── IMMERSIVE REVEAL ─── */}
      <ImmersiveReveal />

      {/* ─── 3D SLIDER ─── */}
      <Slider3D />

      {/* ─── EXPLODING STATS ─── */}
      <ExplodeStats />

      {/* ─── BENTO FEATURES ─── */}
      <section className="py-32 px-6 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mb-16">
          <Badge className="mb-5 bg-[#FFAE6D]/10 text-[#FFAE6D] border-[#FFAE6D]/30 font-mono">
            <PawPrint className="w-3 h-3 mr-1.5" /> THE PLATFORM
          </Badge>
          <h2 className="text-5xl md:text-6xl font-semibold mb-6 leading-[1.05] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            <span className="text-gradient-soft">One app for every</span><br />
            <span className="text-gradient-aurora">wag, purr and paw.</span>
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed">
            From the first meal to the next vet visit — everything a pet parent needs, beautifully organised.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-5">
          {FEATURES_BENTO.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
              className={f.span}>
              <Tilt className="group relative h-full p-7 rounded-3xl glass-card surface-hover overflow-hidden">
                <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-[0.12] group-hover:opacity-30 transition-opacity duration-500" style={{ background: 'radial-gradient(circle, #FFAE6D, transparent 70%)' }} />
                <div className="relative" style={{ transform: 'translateZ(40px)' }}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center backdrop-blur-sm bg-[#FFAE6D]/12 border border-[#FFAE6D]/20">
                      <f.icon className="w-5 h-5 text-[#FFAE6D]" />
                    </div>
                    <Badge className="text-[10px] font-mono uppercase bg-[#FFAE6D]/10 text-[#FFAE6D] border-[#FFAE6D]/25">{f.tag}</Badge>
                  </div>
                  <h3 className="text-xl font-semibold mb-2.5 tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{f.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </Tilt>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── NUTRITION PLANNER DEMO ─── */}
      <section className="relative py-32 border-y border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-mesh-soft" aria-hidden="true" />
        <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-start">
          <motion.div initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <Badge className="mb-5 bg-[#FFAE6D]/10 text-[#FFAE6D] border-[#FFAE6D]/30 font-mono">
              <Apple className="w-3 h-3 mr-1.5" /> NUTRITION PLANNER
            </Badge>
            <h2 className="text-5xl md:text-6xl font-semibold mb-6 leading-[1.05]" style={{ fontFamily: 'var(--font-display)' }}>
              Feed them<br /><span className="text-gradient-aurora">exactly right.</span>
            </h2>
            <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
              Over half of pets are overweight — almost always from guesswork at the food bowl.
              PetPal calculates your pet&rsquo;s precise daily calories, food weight, and meal schedule
              using the same energy formulas vets use.
            </p>
            <ul className="space-y-3 mb-10">
              {['Vet-grade RER/MER calorie math', 'Adjusts for breed, life stage & activity', 'Exact grams, cups and meals per day', 'Re-plans automatically as they grow'].map(t => (
                <li key={t} className="flex items-center gap-3 text-sm text-zinc-300">
                  <CheckCircle2 className="w-5 h-5 text-[#FFAE6D] shrink-0" /> {t}
                </li>
              ))}
            </ul>
            <Link href="/nutrition">
              <Button size="lg" className="btn-glass-primary gap-2 rounded-2xl px-7">Open the full planner <ArrowUpRight className="w-4 h-4" /></Button>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="lg:sticky lg:top-32">
            <div className="relative p-7 rounded-3xl border-gradient glass-card shadow-2xl">
              <div className="absolute -top-3 -right-3 w-12 h-12 rounded-full bg-gradient-to-br from-[#FFAE6D] to-[#8E8BF5] flex items-center justify-center shadow-[0_8px_30px_rgba(255,174,109,0.5)]">
                <Apple className="w-5 h-5 text-[#2A1A08]" />
              </div>
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Live Demo</span>
                <div className="flex items-center gap-1.5 text-[10px] text-[#FFAE6D]"><span className="w-1.5 h-1.5 rounded-full bg-[#FFAE6D] animate-pulse" /> Calculating</div>
              </div>
              <NutritionDemo />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── HEALTH TRACKING ─── */}
      <section className="py-32 px-6 max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <Badge className="mb-5 bg-[#FFAE6D]/10 text-[#FFAE6D] border-[#FFAE6D]/30 font-mono">
            <Activity className="w-3 h-3 mr-1.5" /> HEALTH TRACKING
          </Badge>
          <h2 className="text-5xl font-semibold mb-5 leading-[1.05]" style={{ fontFamily: 'var(--font-display)' }}>
            Every milestone,<br /><span className="text-gradient-aurora">remembered.</span>
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed mb-8">
            Weight trends, vaccine dates, medications and vet visits — all in one timeline,
            with gentle reminders so nothing slips.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[{ icon: Syringe, label: 'Vaccines', v: 'On track' }, { icon: Bell, label: 'Reminders', v: '3 upcoming' }, { icon: Scale, label: 'Weight', v: '−1.4 kg' }].map(s => (
              <div key={s.label} className="glass-card rounded-xl p-4">
                <s.icon className="w-4 h-4 text-[#FFAE6D] mb-2" />
                <div className="text-lg font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{s.v}</div>
                <div className="text-[11px] text-zinc-500">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass-card rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold flex items-center gap-2"><Dog className="w-4 h-4 text-[#FFAE6D]" /> Biscuit · weight (kg)</span>
            <Badge className="bg-[#FFAE6D]/10 text-[#FFAE6D] border-[#FFAE6D]/30 text-xs">Healthy trend</Badge>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={TREND_DATA}>
              <defs>
                <linearGradient id="wgrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFAE6D" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#FFAE6D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="week" tick={{ fill: '#A79CBF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} tick={{ fill: '#A79CBF', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1C1630', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="weight" stroke="#FFAE6D" strokeWidth={2.5} fill="url(#wgrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="relative py-32 border-y border-white/5">
        <div className="absolute inset-0 bg-mesh-soft" aria-hidden="true" />
        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <Badge className="mb-5 bg-[#FFAE6D]/10 text-[#FFAE6D] border-[#FFAE6D]/30 font-mono">
              <Heart className="w-3 h-3 mr-1.5" /> HAPPY TAILS
            </Badge>
            <h2 className="text-5xl md:text-6xl font-semibold mb-5 leading-[1.05]" style={{ fontFamily: 'var(--font-display)' }}>
              <span className="text-gradient-soft">Pet parents</span><br /><span className="text-gradient-aurora">who rest easier.</span>
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <TestimonialCard t={t} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-32 px-6 max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <Badge className="mb-5 bg-white/[0.06] text-zinc-300 border-white/10 font-mono">FAQ</Badge>
          <h2 className="text-5xl font-semibold leading-[1.05]" style={{ fontFamily: 'var(--font-display)' }}>
            Good questions, <span className="text-gradient-aurora">honest answers.</span>
          </h2>
        </motion.div>
        <div className="space-y-3">
          {FAQS.map((f, i) => <FaqItem key={f.q} q={f.q} a={f.a} idx={i} />)}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-mesh" aria-hidden="true" />
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="relative max-w-3xl mx-auto text-center p-12 rounded-3xl border-gradient glass-card">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 animate-float-medium"><Logo size={80} glow /></div>
          <div className="pt-10">
            <h2 className="text-5xl md:text-6xl font-semibold mb-6 leading-[1.05]" style={{ fontFamily: 'var(--font-display)' }}>
              <span className="text-gradient-soft">They give you everything.</span><br />
              <span className="text-gradient-aurora">Give them PetPal.</span>
            </h2>
            <p className="text-zinc-400 text-lg max-w-md mx-auto mb-8 leading-relaxed">
              Set up your pet&rsquo;s profile in under a minute. Free forever, for every pet you love.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/auth/signup"><Button size="lg" className="btn-glass-primary gap-2 rounded-2xl px-7">Add Your Pet <ArrowUpRight className="w-4 h-4" /></Button></Link>
              <Link href="/wellness"><Button size="lg" className="btn-glass text-white gap-2 rounded-2xl px-7">Try the Wellness Check</Button></Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/5 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <Logo size={36} />
                <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>Pet<span className="text-[#FFAE6D]">Pal</span></span>
              </Link>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
                The all-in-one companion for pet owners — nutrition, health, safety and care, beautifully in one place.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">Tools</h4>
              <ul className="space-y-2.5 text-sm text-zinc-400">
                {[['Nutrition Planner', '/nutrition'], ['Food Safety', '/food-safety'], ['Find a Vet', '/vet-finder'], ['Wellness Check', '/wellness'], ['Care Guides', '/resources']].map(([l, h]) => (
                  <li key={l}><Link href={h} className="hover:text-white transition-colors">{l}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">Account</h4>
              <ul className="space-y-2.5 text-sm text-zinc-400">
                <li><Link href="/auth/login" className="hover:text-white transition-colors">Sign In</Link></li>
                <li><Link href="/auth/signup" className="hover:text-white transition-colors">Create Account</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
            <p>&copy; 2026 PetPal · Made for the ones who never let you down.</p>
            <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#FFAE6D] animate-pulse" /> All systems operational</div>
          </div>
        </div>
      </footer>
      </div>
    </div>
  )
}

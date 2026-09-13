'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Check, Circle, Home, Syringe, GraduationCap, Heart, Trophy, PawPrint, Dog, Cat } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { toast } from 'sonner'
import { readRaw, writeJSON, KEYS } from '@/lib/storage'
import { useClientValue } from '@/lib/use-client-value'

type Kind = 'puppy' | 'kitten'

/**
 * The first month, week by week.
 *
 * The Puppy/Kitten switch used to change nothing at all — both species were
 * shown an identical, dog-shaped checklist ("toilet training", "chew toys").
 * Steps that genuinely differ between a puppy and a kitten now vary; the rest
 * are shared.
 */
const WEEKS: { week: number; title: string; icon: typeof Home; steps: Record<Kind, string[]> }[] = [
  {
    week: 1,
    title: 'Settling in',
    icon: Home,
    steps: {
      puppy: [
        'Set up a cosy bed, crate and food & water station',
        'Pick a vet and book the first wellness visit',
        'Puppy-proof the home (cables, houseplants, small objects)',
        'Keep introductions calm — short, quiet meetings only',
      ],
      kitten: [
        'Set up a quiet base room with bed, food, water and litter tray',
        'Pick a vet and book the first wellness visit',
        'Cat-proof the home (cables, lilies and other toxic plants, open windows)',
        'Let them explore at their own pace — never force handling',
      ],
    },
  },
  {
    week: 2,
    title: 'Health & nutrition',
    icon: Syringe,
    steps: {
      puppy: [
        'Start the vaccination schedule with your vet',
        'Set portions in the Nutrition Planner (puppies need ~2× adult energy)',
        'Begin a gentle daily walk and feeding routine',
        'Record a baseline weight — puppies should gain steadily',
      ],
      kitten: [
        'Start the vaccination schedule and discuss worming with your vet',
        'Set portions in the Nutrition Planner (kittens need frequent small meals)',
        'Settle into a consistent feeding and play routine',
        'Record a baseline weight — kittens should gain steadily',
      ],
    },
  },
  {
    week: 3,
    title: 'Training & bonding',
    icon: GraduationCap,
    steps: {
      puppy: [
        'Teach their name and one basic cue (sit)',
        'Reward-based toilet training — take them out after every nap and meal',
        'Short, positive socialisation with new people and sounds',
        'Introduce safe chew toys to protect furniture and teeth',
      ],
      kitten: [
        'Teach their name and get them used to the carrier',
        'Litter-tray habits — keep it clean, quiet and away from their food',
        'Daily wand-toy play to burn energy and build trust',
        'Introduce a scratching post early to save the sofa',
      ],
    },
  },
  {
    week: 4,
    title: 'Routine & joy',
    icon: Heart,
    steps: {
      puppy: [
        'Lock in a consistent daily schedule',
        'Book microchipping and registration if not done',
        'Take the Pet Wellness Check',
        'Celebrate one happy, healthy month!',
      ],
      kitten: [
        'Lock in a consistent daily schedule',
        'Book microchipping, and talk to your vet about neutering timing',
        'Take the Pet Wellness Check',
        'Celebrate one happy, healthy month!',
      ],
    },
  },
]

/**
 * Parse stored step ids without letting a corrupt value throw.
 *
 * Step ids used to be `week-index`, shared between both species. They are now
 * `kind-week-index`, so a legacy id is migrated to the puppy track (the
 * previous default) rather than being silently discarded.
 */
function parseIds(raw: string | null): string[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    if (!Array.isArray(v)) return []
    return v
      .filter((x): x is string => typeof x === 'string')
      .map(id => (/^\d+-\d+$/.test(id) ? `puppy-${id}` : id))
  } catch {
    return []
  }
}

export default function CarePlanPage() {
  const [kind, setKind] = useState<Kind>('puppy')

  // Saved progress is read during render (raw string = stable), so the ticks
  // are correct on the first paint instead of popping in a frame later.
  const savedRaw = useClientValue(() => readRaw(KEYS.carePlan), null)
  const savedDone = useMemo(() => new Set(parseIds(savedRaw)), [savedRaw])
  const [edited, setEdited] = useState<Set<string> | null>(null)
  const done = edited ?? savedDone

  const total = WEEKS.reduce((sum, w) => sum + w.steps[kind].length, 0)
  // Count only the ticks belonging to the species currently on screen —
  // otherwise switching to Kitten would show the Puppy progress.
  const doneForKind = [...done].filter(id => id.startsWith(`${kind}-`)).length
  const pct = total === 0 ? 0 : Math.round((doneForKind / total) * 100)

  function toggle(id: string) {
    setEdited(prev => {
      const next = new Set(prev ?? savedDone)
      if (next.has(id)) next.delete(id)
      else { next.add(id); toast.success('Nice — one step closer! 🐾') }
      writeJSON(KEYS.carePlan, [...next])
      return next
    })
  }

  return (
    <div className="relative min-h-screen">
      <PageHeader
        eyebrow="Roadmap"
        icon={PawPrint}
        title="New pet"
        accent="care plan"
        sub="A gentle, week-by-week guide through your new arrival's first month — with separate puppy and kitten tracks."
        species="rabbit"
      />
      <div className="relative px-6 lg:px-8 py-10 max-w-4xl mx-auto">

        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div className="flex gap-2">
            {([['puppy', 'Puppy', Dog], ['kitten', 'Kitten', Cat]] as const).map(([k, label, Icon]) => (
              <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-all ${kind === k ? 'bg-[#FFAE6D]/15 border-[#FFAE6D]/40 text-[#FFAE6D]' : 'bg-white/[0.03] border-white/8 text-zinc-400 hover:border-white/20'}`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>
          <div className="glass-card rounded-xl px-4 py-2.5 flex items-center gap-3">
            <span className="text-xs text-zinc-400 uppercase tracking-wider">Progress</span>
            <span className="text-2xl font-semibold tabular-nums text-[#FFAE6D]" style={{ fontFamily: 'var(--font-display)' }}>{pct}%</span>
            <div className="w-24 h-1.5 bg-white/[0.06] rounded-full overflow-hidden"><motion.div animate={{ width: `${pct}%` }} className="h-full bg-[#FFAE6D]" /></div>
          </div>
        </div>

        <div className="space-y-5">
          {WEEKS.map((wk, wi) => {
            const steps = wk.steps[kind]
            const weekDone = steps.filter((_, si) => done.has(`${kind}-${wk.week}-${si}`)).length
            const allDone = weekDone === steps.length
            return (
              <motion.div key={wk.week} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: wi * 0.08 }} className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ background: allDone ? 'rgba(255,174,109,0.15)' : 'rgba(255,255,255,0.04)', borderColor: allDone ? 'rgba(255,174,109,0.4)' : 'rgba(255,255,255,0.08)' }}>
                    {allDone ? <Trophy className="w-5 h-5 text-[#FFAE6D]" /> : <wk.icon className="w-5 h-5 text-zinc-300" />}
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider">Week {wk.week}</div>
                    <div className="font-semibold text-lg" style={{ fontFamily: 'var(--font-display)' }}>{wk.title}</div>
                  </div>
                  <span className="ml-auto text-xs text-zinc-500 font-mono">{weekDone}/{steps.length}</span>
                </div>
                <div className="space-y-2">
                  {steps.map((step, si) => {
                    const id = `${kind}-${wk.week}-${si}`
                    const isDone = done.has(id)
                    return (
                      <button key={id} onClick={() => toggle(id)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${isDone ? 'bg-[#FFAE6D]/[0.07]' : 'hover:bg-white/[0.03]'}`}>
                        {isDone ? <div className="w-5 h-5 rounded-md bg-[#FFAE6D] flex items-center justify-center shrink-0"><Check className="w-3.5 h-3.5 text-[#2A1A08]" /></div> : <Circle className="w-5 h-5 text-zinc-600 shrink-0" />}
                        <span className={`text-sm ${isDone ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{step}</span>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

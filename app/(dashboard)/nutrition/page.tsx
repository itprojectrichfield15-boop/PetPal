'use client'

import { useMemo, useState } from 'react'
import { useClientValue } from '@/lib/use-client-value'
import { motion } from 'framer-motion'
import {
  Dog, Cat, Rabbit, Bird, Turtle, Rat, Bone, Flame, Droplets, Beef, Wheat, Info, Sparkles,
} from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import {
  SPECIES_CFG, ACTIVITY_LEVELS, BODY_CONDITIONS, computePlan,
  type SpeciesKey, type LifeStage,
} from '@/lib/nutrition'

/** Presentation-only: the shared engine stays free of UI concerns. */
const SPECIES_ICON: Record<SpeciesKey, typeof Dog> = {
  dog: Dog, cat: Cat, rabbit: Rabbit, bird: Bird, reptile: Turtle, small: Rat,
}

const LIFE_STAGES: LifeStage[] = ['young', 'adult', 'senior']

/**
 * Read `?species=&weight=` — set by the "Nutrition plan for …" link on a
 * pet's page — so the planner opens on that pet instead of a generic dog.
 * Anything missing or out of range falls back to the species default.
 */
function parsePrefill(search: string): { species: SpeciesKey; weight: number } | null {
  const params = new URLSearchParams(search)
  const s = params.get('species')
  if (!s || !(s in SPECIES_CFG)) return null
  const species = s as SpeciesKey
  const cfg = SPECIES_CFG[species]
  const w = Number(params.get('weight'))
  const weight = Number.isFinite(w) && w >= 0.1 && w <= cfg.maxKg ? Math.round(w * 10) / 10 : cfg.defaultKg
  return { species, weight }
}

export default function NutritionPage() {
  const search = useClientValue(() => window.location.search, '')
  const prefill = useMemo(() => parsePrefill(search), [search])

  // Explicit choices override the pre-fill; until the user touches a control
  // the planner shows the pet it was opened for.
  const [speciesChoice, setSpecies] = useState<SpeciesKey | null>(null)
  const [weightChoice, setWeight] = useState<number | null>(null)
  const species = speciesChoice ?? prefill?.species ?? 'dog'
  const weight = weightChoice ?? prefill?.weight ?? SPECIES_CFG[species].defaultKg
  const [activity, setActivity] = useState<number>(1.6)
  const [lifeStage, setLifeStage] = useState<LifeStage>('adult')
  const [bodyCondition, setBodyCondition] = useState(3)

  const cfg = SPECIES_CFG[species]

  // Every number on this screen comes from the one shared calculation, so the
  // landing-page demo and this planner can never disagree again.
  const plan = computePlan({ species, weightKg: weight, activity, lifeStage, bodyCondition })

  /** Switching species rescales the weight into that species' sensible range. */
  function pickSpecies(next: SpeciesKey) {
    if (next === species) return
    setSpecies(next)
    // Each species starts from its own typical weight. Carrying the old value
    // across used to turn a 12 kg dog into a 12 kg cat — a weight the planner
    // then happily fed as though it were healthy.
    setWeight(SPECIES_CFG[next].defaultKg)
  }

  // Steps of 0.1 kg up to 15 kg and 0.5 kg above, so the value shown (one
  // decimal place) is always exactly the value the plan is calculated from.
  // A 0.25 kg step used to show "4.3 kg" while calculating for 4.25.
  const step = cfg.maxKg <= 15 ? 0.1 : 0.5

  return (
    <div className="relative min-h-screen">
      <PageHeader
        eyebrow="Vet-backed"
        icon={Sparkles}
        title="Nutrition"
        accent="Planner"
        sub="Precise daily calories, portions and a feeding schedule — calculated with the energy formulas vets actually use."
        species="cat"
      />
      <div className="relative px-6 lg:px-8 py-10 max-w-5xl mx-auto">

        <div className="grid lg:grid-cols-2 gap-6">
          {/* ── Inputs ── */}
          <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="glass-card rounded-2xl p-6 space-y-6">
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Species</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(SPECIES_CFG) as SpeciesKey[]).map(k => {
                  const Icon = SPECIES_ICON[k]
                  return (
                    <button
                      key={k}
                      onClick={() => pickSpecies(k)}
                      aria-pressed={species === k}
                      className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-xs transition-all ${
                        species === k
                          ? 'bg-primary/15 border-primary/40 text-primary'
                          : 'bg-white/[0.03] border-white/8 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      <Icon className="w-4 h-4" aria-hidden="true" /> {SPECIES_CFG[k].label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="weight" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Weight</label>
                <span className="font-mono text-sm text-primary font-semibold">{weight.toFixed(1)} kg</span>
              </div>
              <input
                id="weight"
                type="range"
                min={0.1}
                max={cfg.maxKg}
                step={step}
                value={Math.min(weight, cfg.maxKg)}
                onChange={e => setWeight(Math.round(+e.target.value * 10) / 10)}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 mt-1 font-mono">
                <span>0.1 kg</span><span>{cfg.maxKg} kg</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Life stage</label>
              <div className="grid grid-cols-3 gap-2">
                {LIFE_STAGES.map(s => (
                  <button
                    key={s}
                    onClick={() => setLifeStage(s)}
                    aria-pressed={lifeStage === s}
                    className={`px-2 py-2 rounded-xl border text-xs capitalize transition-all ${
                      lifeStage === s
                        ? 'bg-primary/15 border-primary/40 text-primary'
                        : 'bg-white/[0.03] border-white/8 text-zinc-400 hover:border-white/20'
                    }`}
                  >
                    {s === 'young' ? cfg.youngLabel : s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Activity level</label>
              <div className="grid grid-cols-3 gap-2">
                {ACTIVITY_LEVELS.map(a => (
                  <button
                    key={a.label}
                    onClick={() => setActivity(a.value)}
                    aria-pressed={activity === a.value}
                    title={a.hint}
                    className={`px-2 py-2 rounded-xl border text-xs transition-all ${
                      activity === a.value
                        ? 'bg-primary/15 border-primary/40 text-primary'
                        : 'bg-white/[0.03] border-white/8 text-zinc-400 hover:border-white/20'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="bcs" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Body condition</label>
                <span className="font-mono text-xs text-zinc-400">
                  {BODY_CONDITIONS.find(b => b.score === bodyCondition)?.label}
                </span>
              </div>
              <input
                id="bcs"
                type="range"
                min={1}
                max={5}
                step={1}
                value={bodyCondition}
                onChange={e => setBodyCondition(+e.target.value)}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                <span>Very thin</span><span>Ideal</span><span>Obese</span>
              </div>
            </div>
          </motion.div>

          {/* ── Results ── */}
          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="glass-card rounded-2xl p-6" style={{ borderColor: 'rgba(255,174,109,0.3)' }}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                <Flame className="w-3.5 h-3.5 text-primary" aria-hidden="true" /> Daily energy target
              </div>
              <div className="flex items-end gap-2">
                <span className="text-6xl font-semibold tabular-nums text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                  {plan.mer}
                </span>
                <span className="text-zinc-500 mb-2">kcal / day</span>
              </div>
              <div className="text-[11px] text-zinc-500 mt-2 font-mono">
                RER {plan.rer} kcal · ×{activity} activity
                {lifeStage !== 'adult' && ` · ${lifeStage === 'young' ? cfg.youngLabel.toLowerCase() : 'senior'}`}
                {bodyCondition !== 3 && ` · ${BODY_CONDITIONS.find(b => b.score === bodyCondition)?.label.toLowerCase()}`}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Bone, label: cfg.foodLabel, v: `${plan.dryGrams}g`, sub: `≈ ${plan.cups} cups` },
                { icon: Beef, label: 'Or wet/fresh', v: `${plan.wetGrams}g`, sub: 'per day' },
                { icon: Wheat, label: plan.meals === 1 ? 'Meal' : 'Meals', v: `${plan.meals}×`, sub: plan.meals === 1 ? 'per day, or as your vet advises' : `≈ ${plan.gramsPerMeal}g each` },
                { icon: Droplets, label: 'Water', v: `${plan.waterMl}ml`, sub: 'typical daily, incl. food moisture' },
              ].map(s => (
                <div key={s.label} className="glass-card rounded-2xl p-4">
                  <s.icon className="w-4 h-4 text-primary mb-2" aria-hidden="true" />
                  <div className="text-2xl font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{s.v}</div>
                  <div className="text-[11px] text-zinc-500">{s.label} · {s.sub}</div>
                </div>
              ))}
            </div>

            <div className="glass-card rounded-2xl p-5">
              <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">Ideal macro profile</div>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={cfg.macros}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: '#A79CBF', fontSize: 11 }} />
                  <Radar dataKey="value" stroke="#FFAE6D" fill="#FFAE6D" fillOpacity={0.3} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-zinc-600 mt-2 leading-relaxed">
                Relative emphasis for a typical healthy {cfg.label.toLowerCase()}, not a guaranteed analysis — check the
                label on your chosen food.
              </p>
            </div>
          </motion.div>
        </div>

        <div className="glass-card rounded-xl p-4 mt-6 flex items-start gap-3">
          <Info className="w-4 h-4 text-[#FFD98E] mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-xs text-zinc-400 leading-relaxed">
            {cfg.note} Calculated using RER (70 × weight<sup>0.75</sup>) with MER multipliers for life stage, activity and
            body condition, and {cfg.kcalPerGramDry} kcal/g for {cfg.foodLabel.toLowerCase()}. This is guidance — confirm
            with your vet for prescription or medical diets, especially for exotic species.
          </p>
        </div>
      </div>
    </div>
  )
}

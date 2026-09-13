'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Dog, Cat, Rabbit, Bird, Turtle, Rat, Bone, Flame, Droplets, Beef, Wheat, Info, Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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

export default function NutritionPage() {
  const [species, setSpecies] = useState<SpeciesKey>('dog')
  const [weight, setWeight] = useState(SPECIES_CFG.dog.defaultKg)
  const [activity, setActivity] = useState<number>(1.6)
  const [lifeStage, setLifeStage] = useState<LifeStage>('adult')
  const [bodyCondition, setBodyCondition] = useState(3)

  const cfg = SPECIES_CFG[species]

  // Every number on this screen comes from the one shared calculation, so the
  // landing-page demo and this planner can never disagree again.
  const plan = computePlan({ species, weightKg: weight, activity, lifeStage, bodyCondition })

  /** Switching species rescales the weight into that species' sensible range. */
  function pickSpecies(next: SpeciesKey) {
    const nextCfg = SPECIES_CFG[next]
    setSpecies(next)
    setWeight(w => {
      const clamped = Math.min(Math.max(w, 0.1), nextCfg.maxKg)
      // If the current weight is wildly out of range for the new species, start
      // from that species' typical weight instead of an odd clamped value.
      return clamped === w ? w : nextCfg.defaultKg
    })
  }

  const step = cfg.maxKg <= 3 ? 0.1 : cfg.maxKg <= 15 ? 0.25 : 0.5

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-mesh-soft pointer-events-none" />
      <div className="relative p-6 lg:p-8 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Badge className="mb-4 bg-[#FF7A6B]/10 text-[#FF7A6B] border-[#FF7A6B]/30 font-mono text-[10px]">
            <Sparkles className="w-3 h-3 mr-1.5" /> VET-BACKED
          </Badge>
          <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Nutrition <span className="text-[#FF7A6B]">Planner</span>
          </h1>
          <p className="text-zinc-400 max-w-xl">
            Precise daily calories, portions and feeding schedule — calculated with the energy formulas vets use.
          </p>
        </motion.div>

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
                          ? 'bg-[#FF7A6B]/15 border-[#FF7A6B]/40 text-[#FF7A6B]'
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
                <span className="font-mono text-sm text-[#FF7A6B] font-semibold">{weight.toFixed(step < 1 ? 1 : 1)} kg</span>
              </div>
              <input
                id="weight"
                type="range"
                min={0.1}
                max={cfg.maxKg}
                step={step}
                value={Math.min(weight, cfg.maxKg)}
                onChange={e => setWeight(+e.target.value)}
                className="w-full accent-[#FF7A6B]"
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
                        ? 'bg-[#FF7A6B]/15 border-[#FF7A6B]/40 text-[#FF7A6B]'
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
                        ? 'bg-[#FF7A6B]/15 border-[#FF7A6B]/40 text-[#FF7A6B]'
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
                className="w-full accent-[#FF7A6B]"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                <span>Very thin</span><span>Ideal</span><span>Obese</span>
              </div>
            </div>
          </motion.div>

          {/* ── Results ── */}
          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="glass-card rounded-2xl p-6" style={{ borderColor: 'rgba(255,122,107,0.3)' }}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                <Flame className="w-3.5 h-3.5 text-[#FF7A6B]" aria-hidden="true" /> Daily energy target
              </div>
              <div className="flex items-end gap-2">
                <span className="text-6xl font-semibold tabular-nums text-[#FF7A6B]" style={{ fontFamily: 'var(--font-display)' }}>
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
                { icon: Wheat, label: 'Meals', v: `${plan.meals}×`, sub: `≈ ${plan.gramsPerMeal}g each` },
                { icon: Droplets, label: 'Water', v: `${plan.waterMl}ml`, sub: 'min daily' },
              ].map(s => (
                <div key={s.label} className="glass-card rounded-2xl p-4">
                  <s.icon className="w-4 h-4 text-[#FF7A6B] mb-2" aria-hidden="true" />
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
                  <PolarAngleAxis dataKey="axis" tick={{ fill: '#A79F9C', fontSize: 11 }} />
                  <Radar dataKey="value" stroke="#FF7A6B" fill="#FF7A6B" fillOpacity={0.3} strokeWidth={2} />
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
          <Info className="w-4 h-4 text-[#FFB84D] mt-0.5 shrink-0" aria-hidden="true" />
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

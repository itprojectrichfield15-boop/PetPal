'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Heart, ArrowRight, ArrowLeft, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/layout/PageHeader'

const QUESTIONS = [
  { q: 'How is your pet’s energy lately?', opts: [['Bright & playful', 3], ['Normal', 2], ['A bit flat', 1], ['Lethargic', 0]] },
  { q: 'How is their appetite?', opts: [['Healthy & consistent', 3], ['Okay', 2], ['Picky', 1], ['Barely eating', 0]] },
  { q: 'Body shape — can you feel the ribs easily?', opts: [['Yes, ideal', 3], ['With a little press', 2], ['Hard to feel', 1], ['Can’t feel them', 0]] },
  { q: 'Coat & skin condition?', opts: [['Shiny & soft', 3], ['Fine', 2], ['Dull / shedding lots', 1], ['Bald patches / itchy', 0]] },
  { q: 'Daily exercise / play?', opts: [['Plenty', 3], ['Some', 2], ['Rarely', 1], ['Almost none', 0]] },
  { q: 'Vaccinations & vet checks up to date?', opts: [['All current', 3], ['Mostly', 2], ['Behind', 1], ['Not sure', 0]] },
  { q: 'Mood & behaviour?', opts: [['Happy & social', 3], ['Normal', 2], ['Withdrawn', 1], ['Anxious / off', 0]] },
  { q: 'Toilet habits?', opts: [['Regular & normal', 3], ['Mostly normal', 2], ['Some changes', 1], ['Clearly abnormal', 0]] },
]

export default function WellnessPage() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [done, setDone] = useState(false)
  const [dir, setDir] = useState(1)

  const q = QUESTIONS[step]
  const answered = answers[step] !== undefined

  function choose(v: number) {
    setAnswers(p => ({ ...p, [step]: v }))
    if (step < QUESTIONS.length - 1) { setDir(1); setTimeout(() => setStep(s => s + 1), 250) }
    else setDone(true)
  }

  const score = Math.round((Object.values(answers).reduce((s, v) => s + v, 0) / (QUESTIONS.length * 3)) * 100)
  const verdict = score >= 80 ? { label: 'Thriving', color: '#FFAE6D', msg: 'Your pet is in great shape. Keep doing what you’re doing!' }
    : score >= 60 ? { label: 'Healthy', color: '#8E8BF5', msg: 'Mostly good — a couple of small things to keep an eye on.' }
    : score >= 40 ? { label: 'Needs attention', color: '#FFD98E', msg: 'Some signs worth addressing. Consider a vet check-up soon.' }
    : { label: 'See a vet', color: '#FF6B81', msg: 'Several concerns — please book a vet visit to be safe.' }

  if (done) {
    return (
      <div className="relative min-h-screen">
        <PageHeader
          eyebrow="Wellness check"
          icon={Heart}
          title="Your pet's"
          accent="score."
          sub="Based on the eight answers you gave."
        />
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 w-full max-w-xl mx-auto px-6 py-12">
          <div className="glass-card rounded-3xl p-8 text-center">
            <h1 className="text-3xl font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>Wellness Score</h1>
            <p className="text-zinc-400 text-sm mb-8">Based on your {QUESTIONS.length} answers</p>
            <div className="relative w-44 h-44 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full border-4 animate-pulse" style={{ borderColor: `${verdict.color}30` }} />
              <div className="absolute inset-5 rounded-full flex flex-col items-center justify-center" style={{ background: '#130F1C', boxShadow: `0 0 60px ${verdict.color}30` }}>
                <span className="text-5xl font-semibold" style={{ color: verdict.color, fontFamily: 'var(--font-display)' }}>{score}</span>
                <span className="text-xs font-semibold mt-1" style={{ color: verdict.color }}>{verdict.label}</span>
              </div>
            </div>
            <p className="text-sm text-zinc-300 mb-8 max-w-sm mx-auto">{verdict.msg}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => { setAnswers({}); setStep(0); setDone(false) }} className="btn-glass text-white gap-2 rounded-xl"><RotateCcw className="w-4 h-4" /> Retake</Button>
              <Link href="/vet-finder"><Button className="btn-glass-primary gap-2 rounded-xl">Find a Vet <ArrowRight className="w-4 h-4" /></Button></Link>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <PageHeader
        eyebrow="Wellness check"
        icon={Heart}
        title="Eight questions,"
        accent="one honest score."
        sub="A guided check of energy, appetite, body condition, coat, routine and mood — with what to do about the result."
      />
      <div className="relative z-10 w-full max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-zinc-400 mb-2">
            <span className="flex items-center gap-2"><Heart className="w-4 h-4 text-primary" /> Pet Wellness Check</span>
            <span>{step + 1} / {QUESTIONS.length}</span>
          </div>
          <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div animate={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }} className="h-full rounded-full bg-primary" />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -dir * 40 }} transition={{ duration: 0.25 }}
            className="glass-card rounded-3xl p-8">
            <h2 className="text-2xl font-semibold mb-8 leading-snug" style={{ fontFamily: 'var(--font-display)' }}>{q.q}</h2>
            <div className="space-y-3">
              {q.opts.map(([label, v]) => (
                <button key={label as string} onClick={() => choose(v as number)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all ${answers[step] === v ? 'bg-primary/15 border-primary/40 text-white' : 'bg-white/[0.03] border-white/8 text-zinc-300 hover:border-white/20'}`}>
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between mt-6">
          <Button onClick={() => { setDir(-1); setStep(s => Math.max(0, s - 1)) }} disabled={step === 0} className="btn-glass text-white gap-2 rounded-xl disabled:opacity-30"><ArrowLeft className="w-4 h-4" /> Back</Button>
          {answered && step < QUESTIONS.length - 1 && (
            <Button onClick={() => { setDir(1); setStep(s => s + 1) }} className="btn-glass-primary gap-2 rounded-xl">Next <ArrowRight className="w-4 h-4" /></Button>
          )}
        </div>
      </div>
    </div>
  )
}

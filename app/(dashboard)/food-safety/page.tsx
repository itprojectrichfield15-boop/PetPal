'use client'

import { useState, useMemo, useDeferredValue } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ShieldCheck, ShieldAlert, ShieldX, Search, MapPin, Sparkles, Stethoscope, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { lookupFood, QUICK_CHECKS, LEVEL_META, type SafetyLevel } from '@/lib/food-safety'

const ICONS: Record<SafetyLevel, typeof ShieldCheck> = {
  safe: ShieldCheck,
  caution: ShieldAlert,
  toxic: ShieldX,
}

export default function FoodSafetyPage() {
  const [query, setQuery] = useState('')
  // Keeps typing responsive on long queries without debouncing away keystrokes.
  const deferred = useDeferredValue(query)
  const result = useMemo(() => lookupFood(deferred), [deferred])

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-mesh-soft pointer-events-none" />
      <div className="relative p-6 lg:p-8 max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Badge className="mb-4 bg-[#FF7A6B]/10 text-[#FF7A6B] border-[#FF7A6B]/30 font-mono text-[10px]">
            <Sparkles className="w-3 h-3 mr-1.5" /> LIFESAVER
          </Badge>
          <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Food Safety <span className="text-[#FF7A6B]">Checker</span>
          </h1>
          <p className="text-zinc-400 max-w-xl">
            Can your pet eat that? Type any food, plant or household item to check instantly.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 mb-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g. chocolate, grapes, chicken…"
              autoFocus
              enterKeyHint="search"
              aria-label="Food, plant or household item to check"
              className="pl-12 pr-11 h-14 text-lg bg-[#100D0E] border-white/8 focus:border-[#FF7A6B]/40 rounded-xl"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {QUICK_CHECKS.map(q => (
              <button
                key={q}
                onClick={() => setQuery(q)}
                className="px-3 py-1.5 rounded-full text-xs border border-white/10 text-zinc-400 hover:text-white hover:border-white/25 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence initial={false}>
          {result.status === 'found' && (() => {
            const meta = LEVEL_META[result.entry.level]
            const Icon = ICONS[result.entry.level]
            return (
              <motion.div
                key="found"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="glass-card rounded-2xl p-6"
                style={{ borderColor: `${meta.color}45` }}
                role="status"
                aria-live="polite"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: `${meta.color}1A`, border: `1px solid ${meta.color}40` }}
                  >
                    <Icon className="w-7 h-7" style={{ color: meta.color }} />
                  </div>
                  <div className="min-w-0">
                    <Badge
                      className="font-mono mb-1"
                      style={{ background: `${meta.color}1A`, color: meta.color, borderColor: `${meta.color}40` }}
                    >
                      {meta.label}
                    </Badge>
                    <div className="text-xl font-semibold capitalize truncate" style={{ fontFamily: 'var(--font-display)' }}>
                      {result.entry.names[0]}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-zinc-300 leading-relaxed">{result.entry.note}</p>

                {result.entry.action && (
                  <div className="mt-4 p-3.5 rounded-xl bg-white/[0.03] border border-white/8">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">What to do</div>
                    <p className="text-sm text-zinc-200 leading-relaxed">{result.entry.action}</p>
                  </div>
                )}

                {result.entry.appliesTo && (
                  <div className="mt-3 text-xs text-zinc-500">
                    Most relevant to: <span className="text-zinc-300">{result.entry.appliesTo}</span>
                  </div>
                )}

                {result.entry.level === 'toxic' && (
                  <div className="mt-5 p-4 rounded-xl bg-[#FF5A5F]/8 border border-[#FF5A5F]/25">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#FF5A5F] mb-1.5">
                      <Stethoscope className="w-4 h-4 shrink-0" /> Suspected poisoning is an emergency
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed mb-3">
                      Phone your own vet, or your nearest 24-hour clinic, straight away. Take the packaging with you
                      and don&rsquo;t wait for symptoms — treatment works best early.
                    </p>
                    <Link href="/vet-finder">
                      <Button className="btn-glass-primary h-9 rounded-lg text-xs gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> Find the nearest vet
                      </Button>
                    </Link>
                  </div>
                )}
              </motion.div>
            )
          })()}

          {result.status === 'unknown' && (
            <motion.div
              key="unknown"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="glass-card rounded-2xl p-8 text-center"
              role="status"
              aria-live="polite"
            >
              <ShieldAlert className="w-10 h-10 mx-auto mb-3 text-[#FFB84D] opacity-70" />
              <p className="text-sm text-zinc-300">
                <span className="text-white">&ldquo;{result.query}&rdquo;</span> isn&rsquo;t in our database yet.
              </p>
              <p className="text-xs text-zinc-500 mt-2 max-w-sm mx-auto leading-relaxed">
                We only show a verdict for items we have checked, because a wrong &ldquo;safe&rdquo; is worse than no
                answer. When in doubt, don&rsquo;t feed it — and ask your vet.
              </p>
              {result.suggestions.length > 0 && (
                <div className="mt-5">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2.5">Did you mean</div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {result.suggestions.map(s => (
                      <button
                        key={s}
                        onClick={() => setQuery(s)}
                        className="px-3 py-1.5 rounded-full text-xs border border-white/10 text-zinc-300 hover:text-white hover:border-[#FF7A6B]/40 transition-all capitalize"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {result.status === 'empty' && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="glass-card rounded-2xl p-10 text-center text-zinc-500 min-h-[180px] flex flex-col items-center justify-center"
            >
              <ShieldCheck className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Type a food above to check if it&rsquo;s safe for your pet.</p>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[11px] text-zinc-600 leading-relaxed mt-5 text-center max-w-lg mx-auto">
          Guidance only, and not a substitute for veterinary advice. Toxicity depends on the amount eaten and on your
          pet&rsquo;s size, species and health — always call your vet if you are worried.
        </p>
      </div>
    </div>
  )
}

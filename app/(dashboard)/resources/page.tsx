'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Heart, ArrowUpRight, X, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import PageHeader from '@/components/layout/PageHeader'
import { GUIDES, type Guide } from '@/lib/guides'

const TAGS = ['All', 'New Owners', 'Nutrition', 'Health', 'Care', 'Behaviour', 'Training', 'Emergency']

export default function ResourcesPage() {
  const [filter, setFilter] = useState('All')
  const [open, setOpen] = useState<Guide | null>(null)
  const filtered = GUIDES.filter(g => filter === 'All' || g.tag === filter)

  return (
    <div className="relative min-h-screen">
      <PageHeader
        eyebrow="Care guides"
        icon={BookOpen}
        title={`${GUIDES.length} guides,`}
        accent="one honest voice."
        sub="Plain-English guides for every kind of pet, at every stage of life — from the first week to the last."
        species="orb"
      />
      <div className="relative px-6 lg:px-8 py-10 max-w-5xl mx-auto">

        <div className="flex gap-2 flex-wrap mb-8">
          {TAGS.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-4 py-1.5 rounded-full text-sm border transition-all ${filter === t ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-[#171226] border-white/10 text-zinc-400 hover:text-white'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((g, i) => (
            <motion.button
              key={g.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => setOpen(g)}
              className="glass-card rounded-2xl p-5 surface-hover group cursor-pointer text-left">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/12 border border-primary/20 flex items-center justify-center"><g.icon className="w-5 h-5 text-primary" /></div>
                <Badge className="bg-white/5 text-zinc-400 border-white/10 text-[10px]">{g.tag}</Badge>
              </div>
              <h3 className="font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>{g.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-4">{g.desc}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">{g.read} read</span>
                <span className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">Read <ArrowUpRight className="w-3 h-3" /></span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Reader modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(null)}
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            <motion.article
              initial={{ y: 40, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full sm:max-w-2xl max-h-[88vh] overflow-y-auto glass-strong border border-white/10 rounded-t-3xl sm:rounded-3xl p-7 sm:p-9"
            >
              <button onClick={() => setOpen(null)} className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 mb-4">
                <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">{open.tag}</Badge>
                <span className="text-xs text-zinc-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {open.read} read</span>
              </div>
              <h2 className="text-3xl font-semibold mb-5 pr-10" style={{ fontFamily: 'var(--font-display)' }}>{open.title}</h2>
              <div className="space-y-4">
                {open.body.map((p, i) => (
                  <p key={i} className="text-zinc-300 leading-relaxed">{p}</p>
                ))}
              </div>
              <div className="mt-7 p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
                <Heart className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-zinc-400 leading-relaxed">General guidance for all pet owners. Always consult your vet for advice specific to your animal&rsquo;s species, breed and health.</p>
              </div>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

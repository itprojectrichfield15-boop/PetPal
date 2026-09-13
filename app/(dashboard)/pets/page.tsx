'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Dog, Cat, Bird, Rabbit, Fish, Turtle, Rat, Snail, PawPrint, Plus, Scale, Apple, Syringe, ChevronRight, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Pet } from '@/lib/types'

// 'invert' is a legacy species value written by older builds of the add-pet
// form; kept here so existing rows still render an icon.
const ICONS: Record<string, LucideIcon> = { dog: Dog, cat: Cat, bird: Bird, rabbit: Rabbit, fish: Fish, reptile: Turtle, small: Rat, invert: Snail, other: PawPrint }

/** Example pets shown until the owner adds their own. */
const SEED: Pet[] = [
  { id: 's1', owner_id: null, name: 'Biscuit', species: 'dog', breed: 'Beagle', age: '3 years', weight: 12.4, sex: 'male', photo_url: null, created_at: '' },
  { id: 's2', owner_id: null, name: 'Luna', species: 'cat', breed: 'Maine Coon', age: '2 years', weight: 5.1, sex: 'female', photo_url: null, created_at: '' },
]

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>(SEED)

  useEffect(() => {
    async function load() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { data } = await supabase.from('pets').select('*').order('created_at', { ascending: false })
        if (data && data.length > 0) setPets(data as Pet[])
      } catch {}
    }
    load()
  }, [])

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-mesh-soft pointer-events-none" />
      <div className="relative p-6 lg:p-8 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              My <span className="text-[#FF7A6B]">Pets</span>
            </h1>
            <p className="text-zinc-400">Every companion, all in one place.</p>
          </div>
          <Link href="/add-pet"><Button className="btn-glass-primary rounded-xl gap-2"><Plus className="w-4 h-4" /> Add</Button></Link>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-5">
          {pets.map((p, i) => {
            const Icon = ICONS[p.species] ?? PawPrint
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="glass-card rounded-3xl p-6 surface-hover">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF7A6B] to-[#2DD4BF] flex items-center justify-center">
                    <Icon className="w-8 h-8 text-[#2A0E0A]" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{p.name}</div>
                    <div className="text-sm text-zinc-400 capitalize">{p.breed || p.species} · {p.age || '—'} · {p.sex}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="glass-card rounded-xl p-3 text-center">
                    <Scale className="w-4 h-4 text-[#FF7A6B] mx-auto mb-1" />
                    <div className="text-sm font-semibold tabular-nums">{p.weight ?? '—'} kg</div>
                  </div>
                  <div className="glass-card rounded-xl p-3 text-center">
                    <Apple className="w-4 h-4 text-[#FF7A6B] mx-auto mb-1" />
                    <div className="text-sm font-semibold">On plan</div>
                  </div>
                  <div className="glass-card rounded-xl p-3 text-center">
                    <Syringe className="w-4 h-4 text-[#FF7A6B] mx-auto mb-1" />
                    <div className="text-sm font-semibold">Current</div>
                  </div>
                </div>
                <Link href="/nutrition"><Button className="btn-glass w-full text-white rounded-xl text-sm gap-1.5">Plan {p.name}&rsquo;s nutrition <ChevronRight className="w-3.5 h-3.5" /></Button></Link>
              </motion.div>
            )
          })}
          <Link href="/add-pet">
            <div className="glass-card rounded-3xl p-6 h-full flex flex-col items-center justify-center text-center border-dashed border-white/15 hover:border-[#FF7A6B]/40 transition-all min-h-[220px] cursor-pointer">
              <Plus className="w-7 h-7 text-[#FF7A6B] mb-2" />
              <span className="text-sm text-zinc-300">Add another pet</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

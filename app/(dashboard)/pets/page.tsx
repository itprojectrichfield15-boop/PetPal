'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { PawPrint, Plus, Scale, Bell, ChevronRight, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/layout/PageHeader'
import { SPECIES_LABELS, toSpecies, type Pet, type PetReminder } from '@/lib/types'
import { speciesIcon } from '@/components/PetIcon'
import { describeDue, daysUntil } from '@/lib/health'

/**
 * The owner's pets.
 *
 * This screen used to show two example pets, Biscuit and Luna, to anybody
 * who had not added a pet yet — so a brand-new account appeared to already own
 * a beagle and a Maine Coon. Every card also read "On plan" and "Current"
 * for vaccinations, which nothing in the app had ever checked. It now shows
 * only the owner's real pets, and only facts the database actually holds.
 */

type Load = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' }

const SEX_LABEL = { male: 'Male', female: 'Female', unknown: 'Sex not given' } as const

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([])
  const [reminders, setReminders] = useState<PetReminder[]>([])
  const [load, setLoad] = useState<Load>({ kind: 'loading' })

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { tryCreateClient } = await import('@/lib/supabase/client')
        const supabase = tryCreateClient()
        if (!supabase) { if (active) setLoad({ kind: 'error', message: 'The database isn’t connected.' }); return }
        const [p, r] = await Promise.all([
          supabase.from('pets').select('*').order('created_at', { ascending: true }),
          supabase.from('pet_reminders').select('*').eq('done', false).order('due_on', { ascending: true }),
        ])
        if (!active) return
        if (p.error) { setLoad({ kind: 'error', message: p.error.message }); return }
        setPets((p.data ?? []) as Pet[])
        // Reminders are an extra: a missing table should not hide the pets.
        setReminders((r.data ?? []) as PetReminder[])
        setLoad({ kind: 'ready' })
      } catch {
        if (active) setLoad({ kind: 'error', message: 'Check your connection and try again.' })
      }
    })()
    return () => { active = false }
  }, [])

  return (
    <div className="relative min-h-screen">
      <PageHeader
        eyebrow="Your family"
        icon={PawPrint}
        title="My"
        accent="pets"
        sub="Every companion, with their reminders and weight history."
        species="dog"
        action={
          <Link href="/add-pet">
            <Button className="btn-glass-primary rounded-xl gap-2"><Plus className="w-4 h-4" /> Add a pet</Button>
          </Link>
        }
      />
      <div className="relative px-6 lg:px-8 py-10 max-w-5xl mx-auto">

        {load.kind === 'loading' && (
          <div className="glass-card rounded-2xl p-10 flex items-center justify-center gap-3 text-sm text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your pets…
          </div>
        )}

        {load.kind === 'error' && (
          <div className="glass-card rounded-2xl p-8 text-center">
            <AlertCircle className="w-7 h-7 text-[#FF6B81] mx-auto mb-3" />
            <p className="text-sm text-zinc-300">Couldn&rsquo;t load your pets.</p>
            <p className="text-xs text-zinc-500 mt-1">{load.message}</p>
          </div>
        )}

        {load.kind === 'ready' && (
          <div className="grid sm:grid-cols-2 gap-5">
            {pets.map((p, i) => {
              const Icon = speciesIcon(p.species)
              const next = reminders.find(r => r.pet_id === p.id)
              const overdue = next ? daysUntil(next.due_on) < 0 : false
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                  <Link href={`/pets/${p.id}`} className="block glass-card rounded-3xl p-6 surface-hover h-full">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-[#8E8BF5] flex items-center justify-center shrink-0">
                        <Icon className="w-8 h-8 text-[#2A1A08]" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xl font-semibold truncate" style={{ fontFamily: 'var(--font-display)' }}>{p.name}</div>
                        <div className="text-sm text-zinc-400 truncate">
                          {[p.breed || SPECIES_LABELS[toSpecies(p.species)], p.age, SEX_LABEL[p.sex] ?? null].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-500 ml-auto shrink-0" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.06]">
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1"><Scale className="w-3.5 h-3.5" /> Weight</div>
                        <div className="text-sm font-semibold tabular-nums">{p.weight ? `${p.weight} kg` : 'Not recorded'}</div>
                      </div>
                      <div className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.06]">
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mb-1"><Bell className="w-3.5 h-3.5" /> Next reminder</div>
                        <div className={`text-sm font-semibold truncate ${overdue ? 'text-[#FF6B81]' : ''}`}>
                          {next ? describeDue(next.due_on) : 'None set'}
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}

            <Link href="/add-pet">
              <div className="glass-card rounded-3xl p-6 h-full flex flex-col items-center justify-center text-center border-dashed border-white/15 hover:border-primary/40 transition-all min-h-[200px] cursor-pointer">
                <Plus className="w-7 h-7 text-primary mb-2" />
                <span className="text-sm text-zinc-300">{pets.length === 0 ? 'Add your first pet' : 'Add another pet'}</span>
                {pets.length === 0 && (
                  <span className="text-xs text-zinc-500 mt-1 max-w-[16rem]">Profiles hold reminders, weigh-ins and a pre-filled nutrition plan.</span>
                )}
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

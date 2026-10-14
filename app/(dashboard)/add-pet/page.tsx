'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { PawPrint, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PageHeader from '@/components/layout/PageHeader'
import { toast } from 'sonner'
import { SPECIES_LABELS, type PetSex, type PetSpecies } from '@/lib/types'
import { SPECIES_ICONS } from '@/components/PetIcon'
import { validatePet, todayISO } from '@/lib/health'

const SPECIES = Object.keys(SPECIES_LABELS) as PetSpecies[]
const SEXES: { key: PetSex; label: string }[] = [
  { key: 'male', label: 'Male' },
  { key: 'female', label: 'Female' },
  { key: 'unknown', label: 'Not sure' },
]

/**
 * Create a pet profile.
 *
 * This used to swallow every error and show "has joined your family!"
 * regardless — a failed insert, a signed-out user or a database that was not
 * set up all looked like success, and the pet simply never appeared. It now
 * validates first, reports the real outcome, and only navigates on success.
 */
export default function AddPetPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', species: 'dog' as PetSpecies, breed: '', age: '', weight: '', sex: 'unknown' as PetSex,
  })
  const [saving, setSaving] = useState(false)

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(p => ({ ...p, [k]: v }))
  }

  async function save() {
    if (saving) return
    const problem = validatePet(form)
    if (problem) { toast.error(problem); return }

    setSaving(true)
    try {
      const { tryCreateClient } = await import('@/lib/supabase/client')
      const supabase = tryCreateClient()
      if (!supabase) {
        toast.error('Can’t save right now', { description: 'The database isn’t connected. See /setup.' })
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please sign in again', { description: 'Your session has expired.' })
        router.push('/auth/login?next=/add-pet')
        return
      }

      const weight = form.weight.trim() ? Number(form.weight) : null
      const { data: pet, error } = await supabase.from('pets').insert({
        owner_id: user.id,
        name: form.name.trim(),
        species: form.species,
        breed: form.breed.trim() || null,
        age: form.age.trim() || null,
        weight,
        sex: form.sex,
      }).select('id').single()

      if (error || !pet) {
        toast.error('Couldn’t add your pet', { description: error?.message ?? 'Please try again.' })
        return
      }

      // The starting weight is also the first point in the weight log, so the
      // trend on the pet's page begins today rather than being empty.
      if (weight !== null) {
        const { error: wErr } = await supabase.from('pet_weights').insert({
          pet_id: pet.id, owner_id: user.id, weight_kg: weight, measured_on: todayISO(),
        })
        if (wErr) {
          toast.warning('Pet saved, but the weight log couldn’t be started', { description: wErr.message })
        }
      }

      toast.success(`${form.name.trim()} has been added`)
      router.push(`/pets/${pet.id}`)
    } catch {
      toast.error('Couldn’t add your pet', { description: 'Check your connection and try again.' })
    } finally {
      setSaving(false)
    }
  }

  const SpeciesIcon = SPECIES_ICONS[form.species] ?? PawPrint

  return (
    <div className="relative min-h-screen">
      <PageHeader
        eyebrow="New profile"
        icon={PawPrint}
        title="Add a"
        accent="pet"
        sub="Set up a profile, then add reminders and weigh-ins from the pet’s own page."
        species="rabbit"
      />
      <div className="relative px-6 lg:px-8 py-10 max-w-2xl mx-auto">

        <motion.form
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          onSubmit={e => { e.preventDefault(); void save() }}
          className="glass-card rounded-3xl p-6 space-y-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-[#8E8BF5] flex items-center justify-center shrink-0">
              <SpeciesIcon className="w-9 h-9 text-[#2A1A08]" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <label htmlFor="pet-name" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Name</label>
              <Input id="pet-name" value={form.name} maxLength={40} onChange={e => set('name', e.target.value)} placeholder="e.g. Biscuit" className="bg-[#130F1C] border-white/10 focus:border-primary/40" />
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Species</span>
            <div className="grid grid-cols-4 gap-2">
              {SPECIES.map(s => {
                const Icon = SPECIES_ICONS[s]
                return (
                  <button type="button" key={s} onClick={() => set('species', s)} aria-pressed={form.species === s}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs transition-all ${form.species === s ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-white/[0.03] border-white/8 text-zinc-400 hover:border-white/20'}`}>
                    <Icon className="w-5 h-5" aria-hidden="true" /> {SPECIES_LABELS[s]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pet-breed" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Breed <span className="normal-case text-zinc-600">(optional)</span></label>
              <Input id="pet-breed" value={form.breed} maxLength={60} onChange={e => set('breed', e.target.value)} placeholder="e.g. Beagle" className="bg-[#130F1C] border-white/10 focus:border-primary/40" />
            </div>
            <div>
              <label htmlFor="pet-age" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Age <span className="normal-case text-zinc-600">(optional)</span></label>
              <Input id="pet-age" value={form.age} maxLength={30} onChange={e => set('age', e.target.value)} placeholder="e.g. 3 years" className="bg-[#130F1C] border-white/10 focus:border-primary/40" />
            </div>
            <div>
              <label htmlFor="pet-weight" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Weight in kg <span className="normal-case text-zinc-600">(optional)</span></label>
              <Input id="pet-weight" type="number" inputMode="decimal" min="0.01" step="0.01" value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="e.g. 12.4" className="bg-[#130F1C] border-white/10 focus:border-primary/40" />
            </div>
            <div>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Sex</span>
              <div className="grid grid-cols-3 gap-2">
                {SEXES.map(s => (
                  <button type="button" key={s.key} onClick={() => set('sex', s.key)} aria-pressed={form.sex === s.key}
                    className={`px-2 py-2 rounded-xl border text-sm transition-all ${form.sex === s.key ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-white/[0.03] border-white/8 text-zinc-400 hover:border-white/20'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button type="submit" disabled={saving} className="btn-glass-primary w-full h-12 rounded-xl text-base font-semibold gap-2">
            {saving ? 'Saving…' : <><Check className="w-4 h-4" /> Add {form.name.trim() || 'pet'}</>}
          </Button>
        </motion.form>
      </div>
    </div>
  )
}

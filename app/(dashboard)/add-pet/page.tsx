'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Dog, Cat, Bird, Rabbit, Fish, Turtle, Rat, Snail, PawPrint, Check, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

const SPECIES = [
  { key: 'dog', label: 'Dog', icon: Dog },
  { key: 'cat', label: 'Cat', icon: Cat },
  { key: 'bird', label: 'Bird', icon: Bird },
  { key: 'rabbit', label: 'Rabbit', icon: Rabbit },
  { key: 'fish', label: 'Fish', icon: Fish },
  { key: 'reptile', label: 'Reptile', icon: Turtle },
  { key: 'small', label: 'Small pet', icon: Rat },
  { key: 'other', label: 'Other', icon: Snail },
]

export default function AddPetPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', species: 'dog', breed: '', age: '', weight: '', sex: 'male' })
  const [saving, setSaving] = useState(false)

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function save() {
    if (!form.name.trim()) { toast.error('Give your pet a name 🐾'); return }
    setSaving(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('pets').insert({
        owner_id: user?.id ?? null,
        name: form.name.trim(),
        species: form.species,
        breed: form.breed || null,
        age: form.age || null,
        weight: form.weight ? Number(form.weight) : null,
        sex: form.sex,
      })
    } catch {}
    toast.success(`${form.name} has joined your family! 🎉`)
    setSaving(false)
    setTimeout(() => router.push('/dashboard'), 700)
  }

  const SpeciesIcon = SPECIES.find(s => s.key === form.species)?.icon ?? PawPrint

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 bg-mesh-soft pointer-events-none" />
      <div className="relative p-6 lg:p-8 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Add a <span className="text-[#FF7A6B]">Pet</span>
          </h1>
          <p className="text-zinc-400">Set up a profile to unlock nutrition plans, reminders and health tracking.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-3xl p-6 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF7A6B] to-[#2DD4BF] flex items-center justify-center relative">
              <SpeciesIcon className="w-9 h-9 text-[#2A0E0A]" />
              <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-[#1A1516] border border-white/10 flex items-center justify-center" aria-label="Add photo"><Camera className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Name</label>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Biscuit" className="bg-[#100D0E] border-white/10 focus:border-[#FF7A6B]/40" />
            </div>
          </div>

          {/* Species */}
          <div>
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Species</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {SPECIES.map(s => (
                <button key={s.key} onClick={() => set('species', s.key)} aria-pressed={form.species === s.key}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs transition-all ${form.species === s.key ? 'bg-[#FF7A6B]/15 border-[#FF7A6B]/40 text-[#FF7A6B]' : 'bg-white/[0.03] border-white/8 text-zinc-400 hover:border-white/20'}`}>
                  <s.icon className="w-5 h-5" /> {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Breed</label>
              <Input value={form.breed} onChange={e => set('breed', e.target.value)} placeholder="e.g. Beagle" className="bg-[#100D0E] border-white/10 focus:border-[#FF7A6B]/40" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Age</label>
              <Input value={form.age} onChange={e => set('age', e.target.value)} placeholder="e.g. 3 years" className="bg-[#100D0E] border-white/10 focus:border-[#FF7A6B]/40" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Weight (kg)</label>
              <Input type="number" value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="e.g. 12.4" className="bg-[#100D0E] border-white/10 focus:border-[#FF7A6B]/40" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Sex</label>
              <div className="grid grid-cols-2 gap-2">
                {['male', 'female'].map(s => (
                  <button key={s} onClick={() => set('sex', s)} aria-pressed={form.sex === s}
                    className={`px-3 py-2 rounded-xl border text-sm capitalize transition-all ${form.sex === s ? 'bg-[#FF7A6B]/15 border-[#FF7A6B]/40 text-[#FF7A6B]' : 'bg-white/[0.03] border-white/8 text-zinc-400 hover:border-white/20'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={save} disabled={saving} className="btn-glass-primary w-full h-12 rounded-xl text-base font-semibold gap-2">
            {saving ? 'Saving…' : <><Check className="w-4 h-4" /> Add {form.name || 'Pet'}</>}
          </Button>
        </motion.div>
      </div>
    </div>
  )
}

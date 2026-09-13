'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  PawPrint, Plus, Apple, Syringe, Bell, Scale,
  Dog, Cat, Bird, Rabbit, Fish, Turtle, Rat, Snail, ArrowUpRight, Stethoscope, ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import type { Pet } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// 'invert' is a legacy species value written by older builds of the add-pet
// form; kept here so existing rows still render an icon.
const ICONS: Record<string, LucideIcon> = { dog: Dog, cat: Cat, bird: Bird, rabbit: Rabbit, fish: Fish, reptile: Turtle, small: Rat, invert: Snail, other: PawPrint }

interface DashPet { name: string; kind: string; species: string; age: string; weight: string; next: string }
const SEED_PETS: DashPet[] = [
  { name: 'Biscuit', kind: 'Beagle', species: 'dog', age: '3 yrs', weight: '12.4 kg', next: 'Vaccine in 9 days' },
  { name: 'Luna', kind: 'Maine Coon', species: 'cat', age: '2 yrs', weight: '5.1 kg', next: 'Deworming in 3 days' },
]

const REMINDERS = [
  { icon: Syringe, label: 'Luna — annual vaccination', when: 'Tomorrow', color: '#FF5A5F' },
  { icon: Apple, label: 'Biscuit — switch to senior food', when: 'In 3 days', color: '#FFB84D' },
  { icon: Stethoscope, label: 'Biscuit — dental check', when: 'In 9 days', color: '#FF7A6B' },
  { icon: Scale, label: 'Weigh both pets', when: 'Sunday', color: '#FF7A6B' },
]

const WEIGHT = [
  { m: 'Jan', w: 13.2 }, { m: 'Feb', w: 13.0 }, { m: 'Mar', w: 12.8 },
  { m: 'Apr', w: 12.6 }, { m: 'May', w: 12.5 }, { m: 'Jun', w: 12.4 },
]

const QUICK = [
  { icon: Plus, label: 'Add a pet', href: '/add-pet' },
  { icon: Apple, label: 'Plan nutrition', href: '/nutrition' },
  { icon: ShieldCheck, label: 'Check a food', href: '/food-safety' },
  { icon: PawPrint, label: 'Find a vet', href: '/vet-finder' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [checking, setChecking] = useState(true)
  const [pets, setPets] = useState<DashPet[]>(SEED_PETS)

  useEffect(() => {
    async function init() {
      const { createClient } = await import('@/lib/supabase/client')
      const { isUserAdmin } = await import('@/lib/auth')
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
      if (data.user && (await isUserAdmin(data.user))) { router.replace('/admin'); return }
      try {
        const { data: rows } = await supabase.from('pets').select('*').order('created_at', { ascending: false })
        if (rows && rows.length > 0) {
          setPets((rows as Pet[]).map(r => ({
            name: r.name,
            kind: r.breed || r.species,
            species: r.species,
            age: r.age || '—',
            weight: r.weight ? `${r.weight} kg` : '—',
            next: 'All up to date',
          })))
        }
      } catch {}
      setChecking(false)
    }
    init()
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-[#FF7A6B]/30 border-t-[#FF7A6B] animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-mesh-soft pointer-events-none" />
      <div className="relative p-6 lg:p-8 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
            </h1>
            <p className="text-zinc-400 text-sm mt-1">Here&rsquo;s how your pets are doing.</p>
          </div>
          <Link href="/add-pet"><Button className="btn-glass-primary rounded-xl gap-2"><Plus className="w-4 h-4" /> Add a pet</Button></Link>
        </motion.div>

        {/* Pets */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {pets.map((p, i) => {
            const Icon = ICONS[p.species] ?? PawPrint
            return (
            <motion.div key={p.name + i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="glass-card rounded-2xl p-5 surface-hover">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF7A6B] to-[#2DD4BF] flex items-center justify-center">
                  <Icon className="w-6 h-6 text-[#2A0E0A]" />
                </div>
                <div>
                  <div className="font-semibold" style={{ fontFamily: 'var(--font-display)' }}>{p.name}</div>
                  <div className="text-xs text-zinc-400">{p.kind} · {p.age}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /> {p.weight}</span>
                <Badge className="bg-[#FF7A6B]/10 text-[#FF7A6B] border-[#FF7A6B]/25 text-[10px]">{p.next}</Badge>
              </div>
            </motion.div>
            )
          })}
          <Link href="/add-pet">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
              className="glass-card rounded-2xl p-5 h-full flex flex-col items-center justify-center text-center border-dashed border-white/15 hover:border-[#FF7A6B]/40 transition-all min-h-[120px] cursor-pointer">
              <Plus className="w-6 h-6 text-[#FF7A6B] mb-2" />
              <span className="text-sm text-zinc-300">Add another pet</span>
            </motion.div>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Weight chart */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="lg:col-span-2 glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-sm uppercase tracking-wider text-zinc-400">Biscuit · weight trend</h2>
              <Badge className="bg-[#FF7A6B]/10 text-[#FF7A6B] border-[#FF7A6B]/25 text-xs">Healthy</Badge>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={WEIGHT}>
                <defs><linearGradient id="dw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FF7A6B" stopOpacity={0.4} /><stop offset="100%" stopColor="#FF7A6B" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="m" tick={{ fill: '#A79F9C', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} tick={{ fill: '#A79F9C', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1A1516', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                <Area type="monotone" dataKey="w" stroke="#FF7A6B" fill="url(#dw)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Reminders */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl p-5">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-zinc-400 mb-5 flex items-center gap-2"><Bell className="w-4 h-4 text-[#FF7A6B]" /> Upcoming</h2>
            <div className="space-y-3">
              {REMINDERS.map((r, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${r.color}18` }}>
                    <r.icon className="w-4 h-4" style={{ color: r.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm leading-tight">{r.label}</div>
                    <div className="text-xs text-zinc-500">{r.when}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {QUICK.map(q => (
            <Link key={q.label} href={q.href}>
              <div className="glass-card rounded-2xl p-5 surface-hover flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF7A6B]/12 border border-[#FF7A6B]/20 flex items-center justify-center"><q.icon className="w-5 h-5 text-[#FF7A6B]" /></div>
                <span className="text-sm font-medium">{q.label}</span>
                <ArrowUpRight className="w-4 h-4 text-zinc-500 ml-auto" />
              </div>
            </Link>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

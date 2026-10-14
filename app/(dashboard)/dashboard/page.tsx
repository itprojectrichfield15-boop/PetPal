'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Plus, Apple, Bell, Scale, LayoutDashboard, ArrowUpRight, ShieldCheck, Shield, AlertCircle, MapPin,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { SPECIES_LABELS, REMINDER_KINDS, toSpecies, type Pet, type PetReminder, type PetWeight } from '@/lib/types'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/layout/PageHeader'
import { speciesIcon } from '@/components/PetIcon'
import { describeDue, daysUntil, formatDay } from '@/lib/health'

/**
 * The signed-in overview.
 *
 * Everything on this screen used to be invented: two example pets shown to
 * every account, a weight chart for "Biscuit" that went from 13.2 to 12.4 kg
 * whoever was looking, a "Healthy" badge on it, and four reminders about pets
 * the user did not own. Every number here now comes from the user's own rows,
 * and when there is nothing to show the screen says so.
 */

type Load = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' }

const QUICK = [
  { icon: Plus, label: 'Add a pet', href: '/add-pet' },
  { icon: Apple, label: 'Plan nutrition', href: '/nutrition' },
  { icon: ShieldCheck, label: 'Check a food', href: '/food-safety' },
  { icon: MapPin, label: 'Find a vet', href: '/vet-finder' },
]

export default function DashboardPage() {
  const [name, setName] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pets, setPets] = useState<Pet[]>([])
  const [reminders, setReminders] = useState<PetReminder[]>([])
  const [weights, setWeights] = useState<PetWeight[]>([])
  const [trendPet, setTrendPet] = useState<string | null>(null)
  const [load, setLoad] = useState<Load>({ kind: 'loading' })

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { tryCreateClient } = await import('@/lib/supabase/client')
        const { isUserAdmin } = await import('@/lib/auth')
        const supabase = tryCreateClient()
        if (!supabase) { if (active) setLoad({ kind: 'error', message: 'The database isn’t connected.' }); return }

        const { data: { user } } = await supabase.auth.getUser()
        if (!active) return
        const display = (user?.user_metadata?.display_name as string | undefined)?.trim()
        setName(display || user?.email?.split('@')[0] || null)
        if (user) isUserAdmin(user).then(a => { if (active) setIsAdmin(a) })

        const [p, r, w] = await Promise.all([
          supabase.from('pets').select('*').order('created_at', { ascending: true }),
          supabase.from('pet_reminders').select('*').eq('done', false).order('due_on', { ascending: true }).limit(50),
          // Newest first so a long history drops its OLDEST points, not its latest.
          supabase.from('pet_weights').select('*').order('measured_on', { ascending: false }).limit(500),
        ])
        if (!active) return
        if (p.error) { setLoad({ kind: 'error', message: p.error.message }); return }
        setPets((p.data ?? []) as Pet[])
        setReminders((r.data ?? []) as PetReminder[])
        setWeights(((w.data ?? []) as PetWeight[]).slice().reverse())
        setLoad({ kind: 'ready' })
      } catch {
        if (active) setLoad({ kind: 'error', message: 'Check your connection and try again.' })
      }
    })()
    return () => { active = false }
  }, [])

  const petName = useMemo(() => new Map(pets.map(p => [p.id, p.name])), [pets])

  // Pets with at least two weigh-ins can show a trend; one point is not a line.
  const trendable = useMemo(
    () => pets.filter(p => weights.filter(w => w.pet_id === p.id).length >= 2),
    [pets, weights],
  )
  const selectedTrend = trendPet && trendable.some(p => p.id === trendPet) ? trendPet : trendable[0]?.id ?? null
  const trend = useMemo(
    () => weights.filter(w => w.pet_id === selectedTrend)
      .map(w => ({ day: formatDay(w.measured_on), kg: Number(w.weight_kg) })),
    [weights, selectedTrend],
  )
  const change = trend.length >= 2 ? +(trend[trend.length - 1].kg - trend[0].kg).toFixed(2) : 0

  const overdueCount = reminders.filter(r => daysUntil(r.due_on) < 0).length

  return (
    <div className="relative min-h-screen">
      <PageHeader
        eyebrow="Overview"
        icon={LayoutDashboard}
        title="Welcome back"
        accent={name ?? undefined}
        sub={
          load.kind === 'loading' ? 'Loading your pets…'
            : load.kind === 'error' ? 'Your pets couldn’t be loaded right now.'
            : pets.length === 0 ? 'Add your first pet to start keeping reminders and weigh-ins.'
            : overdueCount > 0 ? `${overdueCount} ${overdueCount === 1 ? 'reminder is' : 'reminders are'} overdue.`
            : `${pets.length} ${pets.length === 1 ? 'pet' : 'pets'}, nothing overdue.`
        }
        species="cat"
        action={
          <Link href="/add-pet">
            <Button className="btn-glass-primary rounded-xl gap-2"><Plus className="w-4 h-4" /> Add a pet</Button>
          </Link>
        }
      />
      <div className="relative px-6 lg:px-8 py-10 max-w-7xl mx-auto">

        {isAdmin && (
          <Link href="/admin" className="glass-card rounded-xl p-3.5 mb-6 flex items-center gap-3 text-sm hover:border-primary/30">
            <Shield className="w-4 h-4 text-primary" /> You&rsquo;re an administrator — open the admin console
            <ArrowUpRight className="w-4 h-4 text-zinc-500 ml-auto" />
          </Link>
        )}

        {load.kind === 'loading' && (
          <div className="min-h-[200px] flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
        )}

        {load.kind === 'error' && (
          <div className="glass-card rounded-2xl p-8 text-center mb-6">
            <AlertCircle className="w-7 h-7 text-[#FF6B81] mx-auto mb-3" />
            <p className="text-sm text-zinc-300">Couldn&rsquo;t load your pets.</p>
            <p className="text-xs text-zinc-500 mt-1">{load.message}</p>
          </div>
        )}

        {load.kind === 'ready' && (
          <>
            {/* Pets */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {pets.map((p, i) => {
                const Icon = speciesIcon(p.species)
                const next = reminders.find(r => r.pet_id === p.id)
                const overdue = next ? daysUntil(next.due_on) < 0 : false
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                    <Link href={`/pets/${p.id}`} className="block glass-card rounded-2xl p-5 surface-hover h-full">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-[#8E8BF5] flex items-center justify-center shrink-0">
                          <Icon className="w-6 h-6 text-[#2A1A08]" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold truncate" style={{ fontFamily: 'var(--font-display)' }}>{p.name}</div>
                          <div className="text-xs text-zinc-400 truncate">{[p.breed || SPECIES_LABELS[toSpecies(p.species)], p.age].filter(Boolean).join(' · ')}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-zinc-400 flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /> {p.weight ? `${p.weight} kg` : 'No weight yet'}</span>
                        <span className={`truncate ${overdue ? 'text-[#FF6B81]' : 'text-zinc-500'}`}>
                          {next ? `${next.title} · ${describeDue(next.due_on)}` : 'No reminders'}
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
              <Link href="/add-pet">
                <div className="glass-card rounded-2xl p-5 h-full flex flex-col items-center justify-center text-center border-dashed border-white/15 hover:border-primary/40 transition-all min-h-[120px] cursor-pointer">
                  <Plus className="w-6 h-6 text-primary mb-2" />
                  <span className="text-sm text-zinc-300">{pets.length === 0 ? 'Add your first pet' : 'Add another pet'}</span>
                </div>
              </Link>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Weight trend */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="lg:col-span-2 glass-card rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <h2 className="font-semibold text-sm uppercase tracking-wider text-zinc-400">Weight trend</h2>
                  {trendable.length > 1 && (
                    <select aria-label="Pet" value={selectedTrend ?? ''} onChange={e => setTrendPet(e.target.value)}
                      className="h-8 px-2 rounded-lg bg-[#130F1C] border border-white/10 text-xs">
                      {trendable.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  )}
                  {trendable.length === 1 && <span className="text-xs text-zinc-400">{trendable[0].name}</span>}
                </div>
                {trend.length >= 2 ? (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="day" tick={{ fill: '#A79CBF', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} tick={{ fill: '#A79CBF', fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
                        <Tooltip formatter={v => [`${v} kg`, 'Weight']} contentStyle={{ background: '#1C1630', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                        <Line type="monotone" dataKey="kg" stroke="#FFAE6D" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-zinc-500 mt-3">
                      {change === 0 ? 'No change' : `${change > 0 ? '+' : ''}${change} kg`} since {trend[0].day}. Whether that is good depends on
                      your pet&rsquo;s body condition — ask your vet if you&rsquo;re unsure.
                    </p>
                  </>
                ) : (
                  <div className="h-[220px] flex flex-col items-center justify-center text-center text-sm text-zinc-500">
                    <Scale className="w-7 h-7 mb-3 opacity-40" />
                    {pets.length === 0
                      ? 'Add a pet, then log weigh-ins from its page.'
                      : 'Log at least two weigh-ins on a pet’s page to see a trend.'}
                  </div>
                )}
              </motion.div>

              {/* Upcoming */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="glass-card rounded-2xl p-5">
                <h2 className="font-semibold text-sm uppercase tracking-wider text-zinc-400 mb-5 flex items-center gap-2"><Bell className="w-4 h-4 text-primary" /> Upcoming</h2>
                {reminders.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    {pets.length === 0 ? 'Nothing yet.' : 'No reminders set. Add vaccinations, deworming or check-ups from a pet’s page.'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {reminders.slice(0, 6).map(r => {
                      const overdue = daysUntil(r.due_on) < 0
                      return (
                        <Link key={r.id} href={`/pets/${r.pet_id}`} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0 hover:bg-white/[0.02] rounded-lg px-1">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${overdue ? 'bg-[#FF6B81]' : 'bg-primary'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm leading-tight truncate">{petName.get(r.pet_id) ?? 'Pet'} — {r.title}</div>
                            <div className={`text-xs ${overdue ? 'text-[#FF6B81]' : 'text-zinc-500'}`}>{REMINDER_KINDS[r.kind]} · {describeDue(r.due_on)}</div>
                          </div>
                        </Link>
                      )
                    })}
                    {reminders.length > 6 && <p className="text-xs text-zinc-500 pt-2">and {reminders.length - 6} more on your pets&rsquo; pages.</p>}
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}

        {/* Quick actions */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {QUICK.map(q => (
            <Link key={q.label} href={q.href}>
              <div className="glass-card rounded-2xl p-5 surface-hover flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/12 border border-primary/20 flex items-center justify-center"><q.icon className="w-5 h-5 text-primary" /></div>
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

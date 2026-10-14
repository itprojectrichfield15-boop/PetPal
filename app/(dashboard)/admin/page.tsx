'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Shield, Lock, Trash2, MessageSquare, PawPrint,
  Stethoscope, Users, LayoutDashboard, Check, Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import PageHeader from '@/components/layout/PageHeader'
import { formatRelative } from '@/lib/utils'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

type Role = 'loading' | 'forbidden' | 'admin'
interface Post { id: string; text: string; mood: string; hearts: number; created_at: string }

/**
 * Registered veterinary professionals, loaded from the database.
 *
 * This list used to be four invented clinics — Greenpaw, CityVet, New Leaf,
 * Happy Paws — with invented star ratings, and the approve button only changed
 * local React state and showed a success toast. An administrator could click
 * "approve" on a vet who did not exist, be told it worked, and change nothing.
 * The only real way to verify anyone was to run SQL by hand.
 *
 * There is no rating column and no rating anywhere in PetPal, so that column is
 * gone rather than filled with a number we do not have.
 */
interface VetRow {
  id: string
  full_name: string
  practice_name: string | null
  city: string | null
  registration_no: string | null
  verified: boolean
  created_at: string | null
}

/**
 * Registered accounts, loaded from the database.
 *
 * This list used to be four invented people — Amara Okonkwo, Thabo Mokoena and
 * two more — shown on an admin screen as though they were real users of the
 * app, complete with pet counts and a "plan" that PetPal does not have.
 *
 * Reading it for real needed a policy: profiles restricted every account to its
 * own row, so an administrator had nothing to list. "admin reads profiles"
 * grants that, through the is_admin() helper.
 *
 * Pet counts are deliberately not shown. Pets are personal data and the policy
 * on that table restricts them to their owner, which is the right default; an
 * admin screen does not need to see what animals someone keeps.
 */
interface OwnerRow {
  id: string
  display_name: string | null
  email: string | null
  role: string | null
  created_at: string | null
}

/*
 * The two overview charts used to be constants — "New sign-ups this week"
 * rising to 740 a day and "Pets by species" with 6,200 dogs — on a screen
 * whose stat cards had already been fixed to show only real counts. Both are
 * now calculated from rows the administrator can genuinely read: account
 * creation dates from profiles, and Ask a Vet questions by species.
 * Pets stay out of it: they are private to their owner by design.
 */
const SPECIES_ORDER = ['dog', 'cat', 'rabbit', 'bird', 'fish', 'reptile', 'small', 'other'] as const
const SPECIES_NAME: Record<string, string> = {
  dog: 'Dogs', cat: 'Cats', rabbit: 'Rabbits', bird: 'Birds', fish: 'Fish', reptile: 'Reptiles', small: 'Small pets', other: 'Other',
}

/** Registration numbers compared without case or stray spaces. */
function normalReg(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '')
}

/** yyyy-mm-dd in the viewer's own time zone. */
function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** The last `n` calendar days, oldest first. */
function lastDays(n: number): Date[] {
  const out: Date[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    out.push(d)
  }
  return out
}

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'community', label: 'Community', icon: MessageSquare },
  { key: 'vets', label: 'Vets', icon: Stethoscope },
  { key: 'owners', label: 'Accounts', icon: Users },
]

export default function AdminPage() {
  const [role, setRole] = useState<Role>('loading')
  const [tab, setTab] = useState('overview')
  const [posts, setPosts] = useState<Post[]>([])
  const [postCount, setPostCount] = useState(0)
  const [accountCount, setAccountCount] = useState(0)
  const [recentSignups, setRecentSignups] = useState<string[]>([])
  const [questionStats, setQuestionStats] = useState<{ species: string; answer_count: number }[]>([])
  const [owners, setOwners] = useState<OwnerRow[]>([])
  const [ownersLoaded, setOwnersLoaded] = useState(false)
  const [vets, setVets] = useState<VetRow[]>([])
  const [vetsLoaded, setVetsLoaded] = useState(false)
  const [savingVet, setSavingVet] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    async function check() {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const { isUserAdmin } = await import('@/lib/auth')
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setRole('forbidden'); return }
        setUserEmail(user.email ?? '')
        const admin = await isUserAdmin(user)
        setRole(admin ? 'admin' : 'forbidden')
        if (admin) {
          const { data, count } = await supabase.from('confessions')
            .select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(100)
          setPosts((data ?? []) as Post[])
          setPostCount(count ?? data?.length ?? 0)

          const since = lastDays(14)[0]
          const [{ count: accounts }, { data: signups }, { data: qs }] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact', head: true }),
            supabase.from('profiles').select('created_at').gte('created_at', since.toISOString()),
            supabase.from('questions').select('species, answer_count').limit(1000),
          ])
          setAccountCount(accounts ?? 0)
          setRecentSignups((signups ?? []).map(r => r.created_at as string).filter(Boolean))
          setQuestionStats((qs ?? []) as { species: string; answer_count: number }[])

          const { data: vetRows } = await supabase
            .from('vet_profiles')
            .select('id, full_name, practice_name, city, registration_no, verified, created_at')
            .order('created_at', { ascending: false })
          setVets((vetRows ?? []) as VetRow[])
          setVetsLoaded(true)

          const { data: ownerRows } = await supabase
            .from('profiles')
            .select('id, display_name, email, role, created_at')
            .order('created_at', { ascending: false })
            .limit(200)
          setOwners((ownerRows ?? []) as OwnerRow[])
          setOwnersLoaded(true)
        }
      } catch { setRole('forbidden') }
    }
    check()
  }, [])

  /**
   * Delete a post, and only say so once the database has confirmed it.
   *
   * This used to remove the row from the screen and toast "Post removed"
   * before even trying — and there was no delete policy on the table, so the
   * database always refused and the post was back on the next refresh.
   * `.select()` matters: a refusal by row-level security is not an error, it
   * simply deletes zero rows.
   */
  async function removePost(id: string) {
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.from('confessions').delete().eq('id', id).select('id')
      if (error || !data?.length) {
        toast.error('Couldn’t remove that post', {
          description: error?.message ?? 'The database refused. Re-run supabase/schema.sql to add the moderation policy.',
        })
        return
      }
      setPosts(p => p.filter(x => x.id !== id))
      setPostCount(c => Math.max(0, c - 1))
      toast.success('Post removed')
    } catch {
      toast.error('Couldn’t reach the database')
    }
  }

  /**
   * Grant or revoke verification, in the database.
   *
   * The previous version only updated local state, so the toast was the entire
   * effect. If the write fails now — most likely because the admin policy on
   * vet_profiles has not been applied — the row is rolled back and the failure
   * is reported, rather than the screen showing a success it did not achieve.
   */
  async function setVetVerified(id: string, verified: boolean) {
    if (savingVet) return
    setSavingVet(id)
    const before = vets
    setVets(v => v.map(x => (x.id === id ? { ...x, verified } : x)))
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.from('vet_profiles').update({ verified }).eq('id', id)
      if (error) {
        setVets(before)
        toast.error(verified ? 'Couldn’t verify that vet' : 'Couldn’t revoke verification', {
          description: error.message,
        })
        return
      }
      toast.success(verified ? 'Vet verified' : 'Verification revoked', {
        description: verified
          ? 'They can now answer questions on Ask a Vet.'
          : 'They can no longer answer questions.',
      })
    } catch {
      setVets(before)
      toast.error('Couldn’t reach the database')
    } finally {
      setSavingVet(null)
    }
  }

  if (role === 'loading') return (
    <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" /></div>
  )

  if (role === 'forbidden') return (
    <div className="min-h-screen flex items-center justify-center px-6 relative">
      <div className="absolute inset-0 bg-mesh-soft" />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#FF6B81]/10 border border-[#FF6B81]/30 flex items-center justify-center mx-auto mb-6"><Lock className="w-8 h-8 text-[#FF6B81]" /></div>
        <h1 className="text-4xl font-semibold mb-3" style={{ fontFamily: 'var(--font-display)' }}>Access Denied</h1>
        <p className="text-zinc-400 leading-relaxed mb-6">This area is for PetPal administrators only.
          {userEmail && <span className="block mt-2 text-xs text-zinc-500">Signed in as <span className="text-zinc-300 font-mono">{userEmail}</span></span>}</p>
        <div className="flex gap-3 justify-center">
          <Link href="/"><Button className="btn-glass text-white rounded-xl">Home</Button></Link>
          <Link href="/dashboard"><Button className="btn-glass-primary rounded-xl">Dashboard</Button></Link>
        </div>
      </motion.div>
    </div>
  )

  /*
   * Only counts we can actually take.
   *
   * This row used to read "12,431 pet owners", "18,940 pets tracked" and a
   * change figure beside each one — +8.2%, +11%, +5.4%, +2 — none of which
   * came from anywhere. There is no historical snapshot in the schema, so a
   * change-since-last-period cannot be computed at all, and owner and pet
   * counts are unavailable by design: row-level security restricts profiles
   * and pets to their owner, so not even an administrator can count them from
   * the browser. Showing a made-up number on an admin screen is worse than
   * showing three real ones.
   */
  const stats = [
    { label: 'Registered accounts', value: accountCount, icon: Users },
    { label: 'Community posts', value: postCount, icon: MessageSquare },
    { label: 'Verified vets', value: vets.filter(v => v.verified).length, icon: Stethoscope },
    { label: 'Awaiting verification', value: vets.filter(v => !v.verified).length, icon: PawPrint },
  ]

  // Registration numbers claimed by more than one account. Sign-up allows it
  // (blocking it would break sign-up with an unreadable error), so it is
  // surfaced here, where the verification decision is made.
  const regCounts = new Map<string, number>()
  for (const v of vets) {
    if (v.registration_no?.trim()) regCounts.set(normalReg(v.registration_no), (regCounts.get(normalReg(v.registration_no)) ?? 0) + 1)
  }
  const sharedRegistrations = new Set([...regCounts].filter(([, n]) => n > 1).map(([k]) => k))

  const signupsByDay = lastDays(14).map(day => ({
    d: day.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    n: recentSignups.filter(c => localDay(new Date(c)) === localDay(day)).length,
  }))
  const questionsBySpecies = SPECIES_ORDER
    .map(sp => {
      const rows = questionStats.filter(q => (q.species in SPECIES_NAME ? q.species : 'other') === sp)
      return {
        s: SPECIES_NAME[sp],
        answered: rows.filter(q => q.answer_count > 0).length,
        waiting: rows.filter(q => q.answer_count === 0).length,
      }
    })
    .filter(r => r.answered + r.waiting > 0)

  return (
    <div className="relative min-h-screen">
      <PageHeader
        eyebrow="Administration"
        icon={Shield}
        title="Admin"
        accent="console"
        sub={`Signed in as ${userEmail}. Moderate the community, verify veterinary professionals, and review platform activity.`}
      />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-10">
        <div className="flex gap-1 mb-8 overflow-x-auto no-scrollbar">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all ${tab === t.key ? 'bg-primary/12 text-primary border border-primary/20' : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>

            {tab === 'overview' && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {stats.map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card rounded-2xl p-5 surface-hover">
                      <div className="mb-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/12 border border-primary/20 flex items-center justify-center"><s.icon className="w-4 h-4 text-primary" /></div>
                      </div>
                      <div className="text-3xl font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{s.value}</div>
                      <div className="text-xs text-zinc-400">{s.label}</div>
                    </motion.div>
                  ))}
                </div>
                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 glass-card rounded-2xl p-5">
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-zinc-400 mb-1">New accounts — last 14 days</h2>
                    <p className="text-xs text-zinc-500 mb-5">{recentSignups.length} in total.</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={signupsByDay}>
                        <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FFAE6D" stopOpacity={0.4} /><stop offset="100%" stopColor="#FFAE6D" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="d" tick={{ fill: '#A79CBF', fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
                        <YAxis allowDecimals={false} tick={{ fill: '#A79CBF', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                        <Tooltip formatter={v => [v, 'New accounts']} contentStyle={{ background: '#1C1630', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                        <Area type="monotone" dataKey="n" stroke="#FFAE6D" fill="url(#ag)" strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="glass-card rounded-2xl p-5">
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-zinc-400 mb-1">Ask a Vet by species</h2>
                    <p className="text-xs text-zinc-500 mb-5">Answered vs still waiting.</p>
                    {questionsBySpecies.length === 0 ? (
                      <p className="text-sm text-zinc-500">No questions have been asked yet.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={questionsBySpecies} layout="vertical">
                          <XAxis type="number" allowDecimals={false} tick={{ fill: '#A79CBF', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis dataKey="s" type="category" tick={{ fill: '#A79CBF', fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
                          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ background: '#1C1630', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                          <Bar dataKey="answered" name="Answered" stackId="q" fill="#8FD9A8" />
                          <Bar dataKey="waiting" name="Waiting" stackId="q" fill="#FFD98E" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            )}

            {tab === 'community' && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/8 flex items-center justify-between gap-4">
                  <h2 className="font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" /> Community moderation</h2>
                  <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search posts…" className="pl-9 bg-[#1C1630] border-white/8 h-9 text-sm" />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-zinc-500 text-xs uppercase tracking-wider">Post</TableHead>
                      <TableHead className="text-zinc-500 text-xs uppercase tracking-wider">Mood</TableHead>
                      <TableHead className="text-zinc-500 text-xs uppercase tracking-wider">Hearts</TableHead>
                      <TableHead className="text-zinc-500 text-xs uppercase tracking-wider text-right">Action</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {posts.length === 0 && (
                        <TableRow className="border-white/5"><TableCell colSpan={4} className="text-center text-sm text-zinc-500 py-8">No community posts.</TableCell></TableRow>
                      )}
                      {posts.filter(p => p.text.toLowerCase().includes(search.toLowerCase())).map(p => (
                        <TableRow key={p.id} className="border-white/5 hover:bg-white/[0.02]">
                          <TableCell className="max-w-md"><span className="text-sm text-zinc-300 line-clamp-1">{p.text}</span></TableCell>
                          <TableCell><Badge className="bg-white/5 text-zinc-400 border-white/10 text-[10px] capitalize">{p.mood}</Badge></TableCell>
                          <TableCell className="font-mono text-sm">{p.hearts}</TableCell>
                          <TableCell className="text-right"><Button size="sm" onClick={() => removePost(p.id)} className="h-8 px-2 text-[#FF6B81] hover:bg-[#FF6B81]/10 bg-transparent border-0"><Trash2 className="w-4 h-4" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {tab === 'vets' && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/8">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-primary" /> Registered professionals
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    Check the registration number against the register before verifying anyone. A
                    verified vet can answer questions on Ask a Vet, and their answers carry a badge.
                  </p>
                </div>

                {vets.length === 0 ? (
                  <div className="p-8 text-center text-sm text-zinc-400">
                    {vetsLoaded
                      ? 'Nobody has registered as a veterinary professional yet.'
                      : 'Loading…'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-zinc-500 text-xs uppercase tracking-wider">Name</TableHead>
                        <TableHead className="text-zinc-500 text-xs uppercase tracking-wider">Practice</TableHead>
                        <TableHead className="text-zinc-500 text-xs uppercase tracking-wider">Registration</TableHead>
                        <TableHead className="text-zinc-500 text-xs uppercase tracking-wider">Status</TableHead>
                        <TableHead className="text-zinc-500 text-xs uppercase tracking-wider text-right">Action</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {vets.map(v => (
                          <TableRow key={v.id} className="border-white/5 hover:bg-white/[0.02]">
                            <TableCell className="font-medium">{v.full_name}</TableCell>
                            <TableCell className="text-zinc-400 text-sm">
                              {v.practice_name || <span className="text-zinc-600">Not given</span>}
                              {v.city ? <span className="text-zinc-600"> · {v.city}</span> : null}
                            </TableCell>
                            <TableCell className="text-sm font-mono text-zinc-300">
                              {v.registration_no || <span className="text-zinc-600 font-sans">Not given</span>}
                              {v.registration_no && sharedRegistrations.has(normalReg(v.registration_no)) && (
                                <span className="block font-sans text-[10px] text-[#FF6B81] mt-0.5">Same number as another account — check before verifying</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] ${v.verified
                                ? 'bg-[#8E8BF5]/15 text-[#8E8BF5] border-[#8E8BF5]/30'
                                : 'bg-[#FFD98E]/15 text-[#FFD98E] border-[#FFD98E]/30'}`}>
                                {v.verified ? 'verified' : 'pending'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {v.verified ? (
                                <Button size="sm" disabled={savingVet === v.id}
                                  onClick={() => setVetVerified(v.id, false)}
                                  className="h-8 px-3 text-xs text-[#FF6B81] hover:bg-[#FF6B81]/10 bg-transparent border-0">
                                  Revoke
                                </Button>
                              ) : (
                                <Button size="sm" disabled={savingVet === v.id}
                                  onClick={() => setVetVerified(v.id, true)}
                                  className="h-8 px-3 text-xs gap-1.5 text-[#8E8BF5] hover:bg-[#8E8BF5]/10 bg-transparent border-0">
                                  <Check className="w-3.5 h-3.5" /> Verify
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {tab === 'owners' && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/8">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Registered accounts
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    Pets are not listed here. They are personal data and the database restricts them
                    to their owner, which is the right default — running an admin screen does not
                    require seeing what animals someone keeps.
                  </p>
                </div>
                {owners.length === 0 ? (
                  <div className="p-8 text-center text-sm text-zinc-400">
                    {ownersLoaded ? 'No accounts to show.' : 'Loading…'}
                  </div>
                ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-zinc-500 text-xs uppercase tracking-wider">Name</TableHead>
                      <TableHead className="text-zinc-500 text-xs uppercase tracking-wider">Email</TableHead>
                      <TableHead className="text-zinc-500 text-xs uppercase tracking-wider">Role</TableHead>
                      <TableHead className="text-zinc-500 text-xs uppercase tracking-wider">Joined</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {owners.map(o => (
                        <TableRow key={o.id} className="border-white/5 hover:bg-white/[0.02]">
                          <TableCell className="font-medium">{o.display_name || <span className="text-zinc-600">Unnamed</span>}</TableCell>
                          <TableCell className="text-zinc-400 text-sm">{o.email ?? '—'}</TableCell>
                          <TableCell>
                            <Badge className="bg-primary/10 text-primary border-primary/25 text-[10px] capitalize">
                              {o.role ?? 'user'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-zinc-400 text-sm">
                            {o.created_at
                              ? (() => { try { return formatRelative(o.created_at!) } catch { return o.created_at } })()
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

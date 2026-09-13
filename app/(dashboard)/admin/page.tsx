'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Shield, Lock, Trash2, MessageSquare, PawPrint,
  Stethoscope, Users, LayoutDashboard, Check, X, Star, TrendingUp, Search, Plus
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

const SEED_POSTS: Post[] = [
  { id: '1', text: 'Biscuit finally learned to sit AND stay today!', mood: 'proud', hearts: 248, created_at: '2026-06-28' },
  { id: '2', text: 'Used the food checker before giving Luna a bit of my dinner — saved a vet trip.', mood: 'happy', hearts: 519, created_at: '2026-06-28' },
  { id: '3', text: 'Adopted a senior rescue beagle this weekend.', mood: 'happy', hearts: 871, created_at: '2026-06-27' },
  { id: '4', text: 'Any tips for a puppy that cries at night?', mood: 'help', hearts: 333, created_at: '2026-06-27' },
]

const VETS = [
  { id: 1, name: 'Greenpaw Veterinary Clinic', city: 'Johannesburg', rating: 4.9, status: 'verified' },
  { id: 2, name: 'CityVet Animal Hospital', city: 'Cape Town', rating: 4.8, status: 'verified' },
  { id: 3, name: 'New Leaf Pet Care', city: 'Durban', rating: 0, status: 'pending' },
  { id: 4, name: 'Happy Paws Clinic', city: 'Pretoria', rating: 0, status: 'pending' },
]

const OWNERS = [
  { id: 1, name: 'Amara Okonkwo', pets: 1, joined: '2026-05-12', plan: 'Free' },
  { id: 2, name: 'Thabo Mokoena', pets: 1, joined: '2026-05-20', plan: 'Free' },
  { id: 3, name: 'Lerato Dube', pets: 2, joined: '2026-06-01', plan: 'Free' },
  { id: 4, name: 'Sipho Ndlovu', pets: 3, joined: '2026-06-14', plan: 'Free' },
]

const SIGNUPS = [
  { d: 'Mon', n: 220 }, { d: 'Tue', n: 310 }, { d: 'Wed', n: 280 },
  { d: 'Thu', n: 410 }, { d: 'Fri', n: 520 }, { d: 'Sat', n: 690 }, { d: 'Sun', n: 740 },
]
const SPECIES = [
  { s: 'Dogs', n: 6200 }, { s: 'Cats', n: 4100 }, { s: 'Rabbits', n: 800 },
  { s: 'Birds', n: 620 }, { s: 'Other', n: 410 },
]

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'community', label: 'Community', icon: MessageSquare },
  { key: 'vets', label: 'Vets', icon: Stethoscope },
  { key: 'owners', label: 'Pet Owners', icon: Users },
]

export default function AdminPage() {
  const [role, setRole] = useState<Role>('loading')
  const [tab, setTab] = useState('overview')
  const [posts, setPosts] = useState<Post[]>(SEED_POSTS)
  const [vets, setVets] = useState(VETS)
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
          const { data } = await supabase.from('confessions').select('*').order('created_at', { ascending: false }).limit(100)
          if (data && data.length > 0) setPosts(data as Post[])
        }
      } catch { setRole('forbidden') }
    }
    check()
  }, [])

  async function removePost(id: string) {
    setPosts(p => p.filter(x => x.id !== id))
    toast.success('Post removed')
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      if (!/^\d+$/.test(id)) await supabase.from('confessions').delete().eq('id', id)
    } catch {}
  }

  function setVetStatus(id: number, status: string) {
    setVets(v => v.map(x => x.id === id ? { ...x, status } : x))
    toast.success(status === 'verified' ? 'Vet approved' : 'Vet rejected')
  }

  if (role === 'loading') return (
    <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 rounded-full border-2 border-[#FFAE6D]/30 border-t-[#FFAE6D] animate-spin" /></div>
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

  const stats = [
    { label: 'Pet owners', value: '12,431', change: '+8.2%', icon: Users },
    { label: 'Pets tracked', value: '18,940', change: '+11%', icon: PawPrint },
    { label: 'Community posts', value: posts.length, change: '+5.4%', icon: MessageSquare },
    { label: 'Verified vets', value: vets.filter(v => v.status === 'verified').length, change: '+2', icon: Stethoscope },
  ]

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
        {/* The figures and lists below are demonstration data, not live records.
            Stated plainly so nobody mistakes this screen for a working console. */}
        <div className="rounded-xl p-3.5 mb-8 flex items-start gap-2.5 text-xs border border-[#FFD98E]/30 bg-[#FFD98E]/[0.07]">
          <Shield className="w-4 h-4 text-[#FFD98E] shrink-0 mt-px" aria-hidden="true" />
          <span className="text-zinc-200 leading-relaxed">
            <span className="font-semibold">Demonstration data.</span> The figures, owners and vet records on this
            screen are sample content. Community posts are live; the rest is not yet wired to the database.
          </span>
        </div>

        <div className="flex gap-1 mb-8 overflow-x-auto no-scrollbar">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all ${tab === t.key ? 'bg-[#FFAE6D]/12 text-[#FFAE6D] border border-[#FFAE6D]/20' : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'}`}>
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
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-lg bg-[#FFAE6D]/12 border border-[#FFAE6D]/20 flex items-center justify-center"><s.icon className="w-4 h-4 text-[#FFAE6D]" /></div>
                        <Badge className="bg-transparent border-0 text-[#8E8BF5] text-xs"><TrendingUp className="w-3 h-3 mr-1" />{s.change}</Badge>
                      </div>
                      <div className="text-3xl font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>{s.value}</div>
                      <div className="text-xs text-zinc-400">{s.label}</div>
                    </motion.div>
                  ))}
                </div>
                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 glass-card rounded-2xl p-5">
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-zinc-400 mb-6">New sign-ups this week</h2>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={SIGNUPS}>
                        <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FFAE6D" stopOpacity={0.4} /><stop offset="100%" stopColor="#FFAE6D" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="d" tick={{ fill: '#A79CBF', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#A79CBF', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#1C1630', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                        <Area type="monotone" dataKey="n" stroke="#FFAE6D" fill="url(#ag)" strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="glass-card rounded-2xl p-5">
                    <h2 className="font-semibold text-sm uppercase tracking-wider text-zinc-400 mb-6">Pets by species</h2>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={SPECIES} layout="vertical">
                        <XAxis type="number" tick={{ fill: '#A79CBF', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="s" type="category" tick={{ fill: '#A79CBF', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ background: '#1C1630', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                        <Bar dataKey="n" fill="#8E8BF5" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {tab === 'community' && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/8 flex items-center justify-between gap-4">
                  <h2 className="font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-[#FFAE6D]" /> Community moderation</h2>
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
                <div className="p-5 border-b border-white/8 flex items-center justify-between">
                  <h2 className="font-semibold flex items-center gap-2"><Stethoscope className="w-4 h-4 text-[#FFAE6D]" /> Vet listings</h2>
                  <Button className="btn-glass-primary h-9 rounded-lg text-sm gap-1.5"><Plus className="w-3.5 h-3.5" /> Add vet</Button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-zinc-500 text-xs uppercase tracking-wider">Clinic</TableHead>
                      <TableHead className="text-zinc-500 text-xs uppercase tracking-wider">City</TableHead>
                      <TableHead className="text-zinc-500 text-xs uppercase tracking-wider">Rating</TableHead>
                      <TableHead className="text-zinc-500 text-xs uppercase tracking-wider">Status</TableHead>
                      <TableHead className="text-zinc-500 text-xs uppercase tracking-wider text-right">Action</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {vets.map(v => (
                        <TableRow key={v.id} className="border-white/5 hover:bg-white/[0.02]">
                          <TableCell className="font-medium">{v.name}</TableCell>
                          <TableCell className="text-zinc-400 text-sm">{v.city}</TableCell>
                          <TableCell className="text-sm">{v.rating > 0 ? <span className="flex items-center gap-1 text-[#FFD98E]"><Star className="w-3.5 h-3.5 fill-[#FFD98E]" /> {v.rating}</span> : <span className="text-zinc-600">—</span>}</TableCell>
                          <TableCell><Badge className={`text-[10px] capitalize ${v.status === 'verified' ? 'bg-[#8E8BF5]/15 text-[#8E8BF5] border-[#8E8BF5]/30' : 'bg-[#FFD98E]/15 text-[#FFD98E] border-[#FFD98E]/30'}`}>{v.status}</Badge></TableCell>
                          <TableCell className="text-right">
                            {v.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button size="sm" onClick={() => setVetStatus(v.id, 'verified')} className="h-8 px-2 text-[#8E8BF5] hover:bg-[#8E8BF5]/10 bg-transparent border-0"><Check className="w-4 h-4" /></Button>
                                <Button size="sm" onClick={() => setVetStatus(v.id, 'rejected')} className="h-8 px-2 text-[#FF6B81] hover:bg-[#FF6B81]/10 bg-transparent border-0"><X className="w-4 h-4" /></Button>
                              </div>
                            ) : <span className="text-xs text-zinc-600">Approved</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {tab === 'owners' && (
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-white/8"><h2 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-[#FFAE6D]" /> Pet owners</h2></div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-zinc-500 text-xs uppercase tracking-wider">Name</TableHead>
                      <TableHead className="text-zinc-500 text-xs uppercase tracking-wider">Pets</TableHead>
                      <TableHead className="text-zinc-500 text-xs uppercase tracking-wider">Joined</TableHead>
                      <TableHead className="text-zinc-500 text-xs uppercase tracking-wider">Plan</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {OWNERS.map(o => (
                        <TableRow key={o.id} className="border-white/5 hover:bg-white/[0.02]">
                          <TableCell className="font-medium">{o.name}</TableCell>
                          <TableCell className="text-sm"><span className="flex items-center gap-1.5 text-zinc-400"><PawPrint className="w-3.5 h-3.5" /> {o.pets}</span></TableCell>
                          <TableCell className="text-zinc-400 text-sm">{(() => { try { return formatRelative(o.joined) } catch { return o.joined } })()}</TableCell>
                          <TableCell><Badge className="bg-[#FFAE6D]/10 text-[#FFAE6D] border-[#FFAE6D]/25 text-[10px]">{o.plan}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts'
import {
  Stethoscope, ShieldCheck, Clock, MessageSquare, ArrowRight, AlertCircle,
  Search, Send, Inbox, User, BarChart3, Save,
} from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { SPECIES_LABELS, toSpecies, type PetSpecies } from '@/lib/types'

/**
 * The veterinary professional's console.
 *
 * ── Why a vet is not a separate kind of account ─────────────────────────────
 * A vet is a pet owner who ALSO happens to be a vet. Most have animals of their
 * own, and a professional should not lose the nutrition planner and the
 * food-safety checker because they ticked "veterinary professional" at signup.
 * So there is one account type, every owner tool stays available to everybody,
 * and this console is an ADDITIONAL surface that appears only for
 * professionals. That also settles the case of an owner who is also a vet: one
 * account, not two.
 *
 * ── Why it does the work rather than linking away ───────────────────────────
 * The first version of this page showed a status badge, two counters and a list
 * that linked to Ask a Vet — a dashboard that could not do anything. A console
 * a professional visits once is not a console. Answering happens here, the
 * queue can be searched and filtered here, and the professional profile is
 * editable here: vet_profiles has had city, specialities and bio columns since
 * the table was created and nothing had ever written to them, which is why a
 * vet's profile was close to empty.
 *
 * ── Verification ────────────────────────────────────────────────────────────
 * Registering is a claim, not a credential. A new professional can read the
 * queue but not answer until an administrator checks their registration number
 * against the register. The composer is hidden rather than shown-and-failing,
 * and the real gate is the "verified vets answer" policy in the database — a
 * fake vet answer is worse than no answer.
 */

interface QueueItem {
  id: string
  title: string
  body: string
  species: string
  created_at: string
  answer_count: number
}

interface MyAnswer {
  id: string
  body: string
  created_at: string
  questionTitle: string
}

type Tab = 'queue' | 'answers' | 'profile'

interface VetData {
  id: string
  verified: boolean
  fullName: string
  practice: string
  city: string
  specialities: string
  bio: string
  registration: string | null
  queue: QueueItem[]
  answers: MyAnswer[]
}

type State =
  | { kind: 'loading' }
  | { kind: 'anon' }
  | { kind: 'not-a-vet' }
  | { kind: 'offline' }
  | { kind: 'vet'; data: VetData }

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days < 30 ? `${days}d ago` : `${Math.floor(days / 30)}mo ago`
}

export default function VetConsolePage() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [tab, setTab] = useState<Tab>('queue')
  const [query, setQuery] = useState('')
  const [speciesFilter, setSpeciesFilter] = useState<'all' | PetSpecies>('all')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [posting, setPosting] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileEdits, setProfileEdits] = useState<Partial<VetData>>({})

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { tryCreateClient } = await import('@/lib/supabase/client')
        const supabase = tryCreateClient()
        if (!supabase) { if (!cancelled) setState({ kind: 'offline' }); return }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { if (!cancelled) setState({ kind: 'anon' }); return }

        const { data: profile } = await supabase
          .from('vet_profiles')
          .select('full_name, practice_name, city, specialities, bio, registration_no, verified')
          .eq('id', user.id)
          .maybeSingle()

        if (!profile) { if (!cancelled) setState({ kind: 'not-a-vet' }); return }

        // The work queue: questions nobody has answered.
        const { data: questions } = await supabase
          .from('questions')
          .select('id, title, body, species, created_at, answer_count')
          .eq('answer_count', 0)
          .order('created_at', { ascending: false })
          .limit(50)

        // This vet's own answers, newest first, with the question they answered.
        const { data: mine } = await supabase
          .from('answers')
          .select('id, body, created_at, questions(title)')
          .eq('vet_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (cancelled) return
        setState({
          kind: 'vet',
          data: {
            id: user.id,
            verified: Boolean(profile.verified),
            fullName: profile.full_name ?? '',
            practice: profile.practice_name ?? '',
            city: profile.city ?? '',
            specialities: profile.specialities ?? '',
            bio: profile.bio ?? '',
            registration: profile.registration_no,
            queue: (questions ?? []) as QueueItem[],
            answers: (mine ?? []).map(a => {
              const q = (a as { questions?: { title?: string } | { title?: string }[] }).questions
              const title = Array.isArray(q) ? q[0]?.title : q?.title
              return {
                id: a.id as string,
                body: a.body as string,
                created_at: a.created_at as string,
                questionTitle: title ?? 'A question',
              }
            }),
          },
        })
      } catch {
        if (!cancelled) setState({ kind: 'offline' })
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const vet = state.kind === 'vet' ? state.data : null

  /** Queue after the search box and species filter. */
  const visibleQueue = useMemo(() => {
    if (!vet) return []
    const q = query.trim().toLowerCase()
    return vet.queue.filter(item => {
      if (speciesFilter !== 'all' && toSpecies(item.species) !== speciesFilter) return false
      if (!q) return true
      return item.title.toLowerCase().includes(q) || item.body.toLowerCase().includes(q)
    })
  }, [vet, query, speciesFilter])

  /** Queue composition by species — what is actually waiting, not a sample. */
  const speciesBreakdown = useMemo(() => {
    if (!vet) return []
    const counts = new Map<string, number>()
    for (const item of vet.queue) {
      const key = SPECIES_LABELS[toSpecies(item.species)] ?? 'Other'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [vet])

  async function postAnswer(questionId: string) {
    if (!vet || posting) return
    const text = (drafts[questionId] ?? '').trim()
    if (text.length < 20) {
      toast.error('Give the owner a little more to work with', { description: 'At least 20 characters.' })
      return
    }
    setPosting(questionId)
    try {
      const { tryCreateClient } = await import('@/lib/supabase/client')
      const supabase = tryCreateClient()
      if (!supabase) { toast.error('The question board isn’t reachable right now.'); return }

      const { data, error } = await supabase
        .from('answers')
        .insert({ question_id: questionId, vet_id: vet.id, body: text })
        .select('id, created_at').single()

      if (error || !data) {
        // Most likely the RLS policy refusing an unverified account.
        toast.error('Couldn’t post that answer', {
          description: error?.message ?? 'Your account may not be verified yet.',
        })
        return
      }

      const answered = vet.queue.find(q => q.id === questionId)
      setState({
        kind: 'vet',
        data: {
          ...vet,
          queue: vet.queue.filter(q => q.id !== questionId),
          answers: [
            { id: data.id as string, body: text, created_at: data.created_at as string,
              questionTitle: answered?.title ?? 'A question' },
            ...vet.answers,
          ],
        },
      })
      setDrafts(d => ({ ...d, [questionId]: '' }))
      toast.success('Answer posted', { description: 'The owner will see it on Ask a Vet.' })
    } catch {
      toast.error('Couldn’t post that answer', { description: 'Check your connection and try again.' })
    } finally {
      setPosting(null)
    }
  }

  async function saveProfile() {
    if (!vet || savingProfile) return
    setSavingProfile(true)
    try {
      const { tryCreateClient } = await import('@/lib/supabase/client')
      const supabase = tryCreateClient()
      if (!supabase) { toast.error('The database isn’t reachable'); return }

      const next = {
        full_name: (profileEdits.fullName ?? vet.fullName).trim(),
        practice_name: (profileEdits.practice ?? vet.practice).trim() || null,
        city: (profileEdits.city ?? vet.city).trim() || null,
        specialities: (profileEdits.specialities ?? vet.specialities).trim() || null,
        bio: (profileEdits.bio ?? vet.bio).trim() || null,
      }
      if (!next.full_name) { toast.error('Your name can’t be empty'); return }

      const { error } = await supabase.from('vet_profiles').update(next).eq('id', vet.id)
      if (error) {
        toast.error('Couldn’t save your profile', { description: error.message })
        return
      }

      setState({
        kind: 'vet',
        data: {
          ...vet,
          fullName: next.full_name,
          practice: next.practice_name ?? '',
          city: next.city ?? '',
          specialities: next.specialities ?? '',
          bio: next.bio ?? '',
        },
      })
      setProfileEdits({})
      toast.success('Profile saved', { description: 'It appears beside your answers.' })
    } catch {
      toast.error('Couldn’t save your profile')
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        eyebrow="Professional"
        title="Vet"
        accent="console"
        sub="Answer owners, track what you've written, and keep your professional profile current."
        species="bird"
      />

      <div className="max-w-6xl mx-auto px-6 pb-24 -mt-4">
        {state.kind === 'loading' && (
          <div className="glass-card rounded-2xl p-8 text-center text-zinc-400">Loading your console…</div>
        )}
        {state.kind === 'offline' && (
          <Notice icon={AlertCircle} title="The database isn’t reachable"
            body="Your console needs the database. Check /setup for the exact problem." />
        )}
        {state.kind === 'anon' && (
          <Notice icon={AlertCircle} title="Sign in to use the console"
            body="This area is for registered veterinary professionals."
            action={{ href: '/auth/login', label: 'Sign in' }} />
        )}
        {state.kind === 'not-a-vet' && (
          <Notice icon={Stethoscope} title="This is a professional area"
            body="Your account isn’t registered as a veterinary professional. Everything else in PetPal is open to you as normal — the owner tools are all in the sidebar."
            action={{ href: '/dashboard', label: 'Back to your dashboard' }} />
        )}

        {vet && (
          <div className="space-y-6">
            {/* ── Status strip ─────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-5 flex flex-wrap items-center gap-4">
              <div className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${
                vet.verified ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                {vet.verified ? <ShieldCheck size={20} /> : <Clock size={20} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">
                  {vet.verified ? 'Verified professional' : 'Verification pending'}
                </div>
                <p className="text-sm text-zinc-400 mt-0.5">
                  {vet.verified
                    ? `${vet.fullName}${vet.practice ? ` · ${vet.practice}` : ''} — your answers carry a verified badge.`
                    : 'An administrator checks your registration number against the register before you can answer.'}
                </p>
              </div>
              <div className="flex gap-6 shrink-0">
                <Metric label="In the queue" value={vet.queue.length} />
                <Metric label="You’ve answered" value={vet.answers.length} />
              </div>
            </motion.div>

            {/* ── Tabs ─────────────────────────────────────────────────── */}
            <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.03] w-fit">
              {([
                { key: 'queue', label: 'Queue', icon: Inbox },
                { key: 'answers', label: 'My answers', icon: MessageSquare },
                { key: 'profile', label: 'Profile', icon: User },
              ] as const).map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${
                    tab === t.key ? 'bg-primary/15 text-primary' : 'text-zinc-400 hover:text-white'}`}>
                  <t.icon size={15} /> {t.label}
                </button>
              ))}
            </div>

            {/* ── Queue ────────────────────────────────────────────────── */}
            {tab === 'queue' && (
              <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        value={query} onChange={e => setQuery(e.target.value)}
                        placeholder="Search the queue…"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-primary/50"
                      />
                    </div>
                    <select
                      value={speciesFilter}
                      onChange={e => setSpeciesFilter(e.target.value as 'all' | PetSpecies)}
                      className="px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-primary/50"
                    >
                      <option value="all">All species</option>
                      {Object.entries(SPECIES_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {visibleQueue.length === 0 ? (
                    <div className="glass-card rounded-2xl p-8 text-center">
                      <Inbox size={26} className="mx-auto text-zinc-500 mb-3" />
                      <p className="text-sm text-zinc-400">
                        {vet.queue.length === 0
                          ? 'Nothing waiting. Every question has at least one answer.'
                          : 'No question in the queue matches that filter.'}
                      </p>
                    </div>
                  ) : visibleQueue.map(item => (
                    <div key={item.id} className="glass-card rounded-2xl p-5">
                      <div className="flex items-start gap-3">
                        <span className="text-[11px] px-2 py-1 rounded-lg bg-white/5 text-zinc-400 shrink-0">
                          {SPECIES_LABELS[toSpecies(item.species)] ?? item.species}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold">{item.title}</h3>
                          <p className="text-sm text-zinc-400 mt-1 whitespace-pre-wrap">{item.body}</p>
                          <p className="text-xs text-zinc-500 mt-2">Asked {timeAgo(item.created_at)}</p>
                        </div>
                      </div>

                      {vet.verified ? (
                        <div className="mt-4">
                          <textarea
                            value={drafts[item.id] ?? ''}
                            onChange={e => setDrafts(d => ({ ...d, [item.id]: e.target.value }))}
                            placeholder="Write your professional answer…"
                            rows={3}
                            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-primary/50 resize-y"
                          />
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-zinc-500">
                              {(drafts[item.id] ?? '').trim().length} / 20 minimum
                            </span>
                            <button
                              onClick={() => postAnswer(item.id)}
                              disabled={posting === item.id}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                            >
                              <Send size={14} />
                              {posting === item.id ? 'Posting…' : 'Post answer'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-4 text-xs text-amber-300/80 bg-amber-500/10 rounded-xl px-3 py-2">
                          You can read the queue while verification is pending. Answering opens up once an
                          administrator has checked your registration number.
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Queue composition — real counts from the queue above. */}
                <div className="glass-card rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 size={16} className="text-zinc-400" />
                    <h3 className="font-semibold text-sm">What’s waiting, by species</h3>
                  </div>
                  {speciesBreakdown.length === 0 ? (
                    <p className="text-sm text-zinc-500">Nothing in the queue to chart.</p>
                  ) : (
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={speciesBreakdown} layout="vertical" margin={{ left: 8, right: 16 }}>
                          <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.06)" />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#A79CBF' }} />
                          <YAxis type="category" dataKey="name" width={64}
                            tick={{ fontSize: 11, fill: '#A79CBF' }} />
                          <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                            contentStyle={{ background: '#1C1630', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                          />
                          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                            {speciesBreakdown.map((_, i) => (
                              <Cell key={i} fill="var(--primary)" fillOpacity={1 - i * 0.13} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <p className="text-xs text-zinc-500 mt-3">
                    Counted from the {vet.queue.length} unanswered question{vet.queue.length === 1 ? '' : 's'} above.
                  </p>
                </div>
              </div>
            )}

            {/* ── My answers ───────────────────────────────────────────── */}
            {tab === 'answers' && (
              <div className="space-y-3">
                {vet.answers.length === 0 ? (
                  <div className="glass-card rounded-2xl p-8 text-center">
                    <MessageSquare size={26} className="mx-auto text-zinc-500 mb-3" />
                    <p className="text-sm text-zinc-400">
                      You haven’t answered anything yet. The queue is on the first tab.
                    </p>
                  </div>
                ) : vet.answers.map(a => (
                  <div key={a.id} className="glass-card rounded-2xl p-5">
                    <p className="text-sm font-medium text-zinc-300">{a.questionTitle}</p>
                    <p className="text-sm text-zinc-400 mt-2 whitespace-pre-wrap">{a.body}</p>
                    <p className="text-xs text-zinc-500 mt-3">Answered {timeAgo(a.created_at)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── Profile ──────────────────────────────────────────────── */}
            {tab === 'profile' && (
              <div className="glass-card rounded-2xl p-6 max-w-2xl">
                <h3 className="font-semibold">Professional profile</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  This is what an owner sees beside your answers.
                </p>

                <div className="mt-5 space-y-4">
                  <Field label="Full name" value={profileEdits.fullName ?? vet.fullName}
                    onChange={v => setProfileEdits(e => ({ ...e, fullName: v }))} />
                  <Field label="Practice" placeholder="e.g. Umhlanga Animal Hospital"
                    value={profileEdits.practice ?? vet.practice}
                    onChange={v => setProfileEdits(e => ({ ...e, practice: v }))} />
                  <Field label="City" placeholder="e.g. Durban"
                    value={profileEdits.city ?? vet.city}
                    onChange={v => setProfileEdits(e => ({ ...e, city: v }))} />
                  <Field label="Specialities" placeholder="e.g. Small animal surgery, dermatology"
                    value={profileEdits.specialities ?? vet.specialities}
                    onChange={v => setProfileEdits(e => ({ ...e, specialities: v }))} />
                  <Field label="About you" multiline placeholder="A sentence or two for owners reading your answers."
                    value={profileEdits.bio ?? vet.bio}
                    onChange={v => setProfileEdits(e => ({ ...e, bio: v }))} />

                  <div className="rounded-xl bg-white/[0.03] px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-zinc-500">Registration number</div>
                    <div className="text-sm mt-0.5">{vet.registration ?? 'Not given'}</div>
                    <p className="text-xs text-zinc-500 mt-1">
                      Changed by an administrator only — it is what your verification is checked against.
                    </p>
                  </div>

                  <button onClick={saveProfile} disabled={savingProfile}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                    <Save size={15} /> {savingProfile ? 'Saving…' : 'Save profile'}
                  </button>
                </div>
              </div>
            )}

            <p className="text-xs text-zinc-500">
              You keep every owner tool as well — nutrition, food safety, wellness and the rest are in the
              sidebar. Being a professional adds this console; it doesn’t take anything away.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <div className="text-2xl font-bold leading-none">{value}</div>
      <div className="text-[11px] text-zinc-500 mt-1">{label}</div>
    </div>
  )
}

function Field({
  label, value, onChange, placeholder, multiline,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  const cls =
    'w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm outline-none focus:border-primary/50'
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</span>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          rows={3} className={`${cls} mt-1 resize-y`} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className={`${cls} mt-1`} />
      )}
    </label>
  )
}

function Notice({
  icon: Icon, title, body, action,
}: {
  icon: typeof AlertCircle
  title: string
  body: string
  action?: { href: string; label: string }
}) {
  return (
    <div className="glass-card rounded-2xl p-8 text-center">
      <Icon size={28} className="mx-auto text-zinc-400 mb-3" />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-zinc-400 mt-2 max-w-md mx-auto">{body}</p>
      {action && (
        <Link href={action.href}
          className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm">
          {action.label} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  )
}

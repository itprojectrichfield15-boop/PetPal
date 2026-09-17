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
  Search, Send, Inbox, User, BarChart3, Save, BookmarkPlus, Trash2, Power, Plus,
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

type Tab = 'queue' | 'answers' | 'replies' | 'profile'

/**
 * A saved reply.
 *
 * The first version of this console was entirely about owners — read their
 * questions, answer their questions. A professional needs tools of their own,
 * and the most immediate one is not having to type the same paragraph about
 * post-operative feeding for the twentieth time. These belong to the vet
 * alone; the policy on vet_replies is scoped to the author, because a
 * half-written draft is not something an owner should ever be able to read.
 */
interface SavedReply {
  id: string
  title: string
  body: string
  uses: number
}

interface VetData {
  id: string
  verified: boolean
  fullName: string
  practice: string
  city: string
  specialities: string
  bio: string
  registration: string | null
  /** Whether this vet is currently taking questions. */
  accepting: boolean
  queue: QueueItem[]
  answers: MyAnswer[]
  replies: SavedReply[]
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
  const [newReply, setNewReply] = useState({ title: '', body: '' })
  const [savingReply, setSavingReply] = useState(false)
  const [togglingAccepting, setTogglingAccepting] = useState(false)
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
          .select('full_name, practice_name, city, specialities, bio, registration_no, verified, accepting')
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

        // The vet's own saved replies. Most-used first, so the ones that earn
        // their place are the ones in reach.
        const { data: replyRows } = await supabase
          .from('vet_replies')
          .select('id, title, body, uses')
          .eq('vet_id', user.id)
          .order('uses', { ascending: false })
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
            accepting: profile.accepting !== false,
            replies: (replyRows ?? []) as SavedReply[],
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

  /** Step in or out of the queue without deleting anything. */
  async function toggleAccepting() {
    if (!vet || togglingAccepting) return
    const next = !vet.accepting
    setTogglingAccepting(true)
    const before = vet.accepting
    setState({ kind: 'vet', data: { ...vet, accepting: next } })
    try {
      const { tryCreateClient } = await import('@/lib/supabase/client')
      const supabase = tryCreateClient()
      if (!supabase) throw new Error('offline')
      const { error } = await supabase.from('vet_profiles').update({ accepting: next }).eq('id', vet.id)
      if (error) throw error
      toast.success(next ? 'You’re taking questions again' : 'Marked as not taking questions', {
        description: next
          ? 'Owners will see you as available.'
          : 'Your profile stays up; you just won’t be listed as available.',
      })
    } catch {
      setState({ kind: 'vet', data: { ...vet, accepting: before } })
      toast.error('Couldn’t change your availability')
    } finally {
      setTogglingAccepting(false)
    }
  }

  async function addReply() {
    if (!vet || savingReply) return
    const title = newReply.title.trim()
    const body = newReply.body.trim()
    if (title.length < 2) { toast.error('Give the reply a short name'); return }
    if (body.length < 20) { toast.error('The reply needs at least 20 characters'); return }

    setSavingReply(true)
    try {
      const { tryCreateClient } = await import('@/lib/supabase/client')
      const supabase = tryCreateClient()
      if (!supabase) { toast.error('The database isn’t reachable'); return }
      const { data, error } = await supabase
        .from('vet_replies')
        .insert({ vet_id: vet.id, title, body })
        .select('id, title, body, uses').single()
      if (error || !data) {
        toast.error('Couldn’t save that reply', { description: error?.message })
        return
      }
      setState({ kind: 'vet', data: { ...vet, replies: [data as SavedReply, ...vet.replies] } })
      setNewReply({ title: '', body: '' })
      toast.success('Reply saved', { description: 'It’s now one click away in the queue.' })
    } catch {
      toast.error('Couldn’t save that reply')
    } finally {
      setSavingReply(false)
    }
  }

  async function deleteReply(id: string) {
    if (!vet) return
    const before = vet.replies
    setState({ kind: 'vet', data: { ...vet, replies: vet.replies.filter(r => r.id !== id) } })
    try {
      const { tryCreateClient } = await import('@/lib/supabase/client')
      const supabase = tryCreateClient()
      if (!supabase) throw new Error('offline')
      const { error } = await supabase.from('vet_replies').delete().eq('id', id)
      if (error) throw error
      toast.success('Reply deleted')
    } catch {
      setState({ kind: 'vet', data: { ...vet, replies: before } })
      toast.error('Couldn’t delete that reply')
    }
  }

  /** Drop a saved reply into the composer for a question, and count the use. */
  async function insertReply(questionId: string, reply: SavedReply) {
    if (!vet) return
    setDrafts(d => ({
      ...d,
      [questionId]: d[questionId] ? `${d[questionId].trimEnd()}

${reply.body}` : reply.body,
    }))
    setState({
      kind: 'vet',
      data: {
        ...vet,
        replies: vet.replies.map(r => (r.id === reply.id ? { ...r, uses: r.uses + 1 } : r)),
      },
    })
    try {
      const { tryCreateClient } = await import('@/lib/supabase/client')
      const supabase = tryCreateClient()
      // Best effort. A missed count is not worth interrupting the vet over.
      await supabase?.from('vet_replies').update({ uses: reply.uses + 1 }).eq('id', reply.id)
    } catch { /* ignore */ }
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

      {/*
        * No negative top margin here. It used to be -mt-4, which pulled this
        * container up over the header's bottom edge — the header's panel ends
        * on a border, so the card below overlapped it and the two edges drew
        * across each other. Every other tool page uses plain padding, and this
        * one now matches them.
        */}
      <div className="relative max-w-6xl mx-auto px-6 lg:px-8 py-10 pb-24">
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
              <div className="flex items-center gap-6 shrink-0">
                <Metric label="In the queue" value={vet.queue.length} />
                <Metric label="You’ve answered" value={vet.answers.length} />
                {/* Stepping out of the queue without deleting anything. */}
                <button
                  onClick={toggleAccepting}
                  disabled={togglingAccepting}
                  title={vet.accepting ? 'Stop taking questions' : 'Start taking questions again'}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 ${
                    vet.accepting
                      ? 'bg-emerald-500/12 text-emerald-300 hover:bg-emerald-500/20'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  <Power size={14} />
                  {vet.accepting ? 'Taking questions' : 'Not taking questions'}
                </button>
              </div>
            </motion.div>

            {/* ── Tabs ─────────────────────────────────────────────────── */}
            <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.03] w-fit">
              {([
                { key: 'queue', label: 'Queue', icon: Inbox },
                { key: 'answers', label: 'My answers', icon: MessageSquare },
                { key: 'replies', label: 'Saved replies', icon: BookmarkPlus },
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
                          {vet.replies.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              <span className="text-[11px] text-zinc-500 mr-1">Insert:</span>
                              {vet.replies.slice(0, 6).map(r => (
                                <button
                                  key={r.id}
                                  onClick={() => insertReply(item.id, r)}
                                  title={r.body.slice(0, 120)}
                                  className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300"
                                >
                                  {r.title}
                                </button>
                              ))}
                            </div>
                          )}
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

            {/* ── Saved replies ────────────────────────────────────────── */}
            {tab === 'replies' && (
              <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
                <div className="space-y-3">
                  {vet.replies.length === 0 ? (
                    <div className="glass-card rounded-2xl p-8 text-center">
                      <BookmarkPlus size={26} className="mx-auto text-zinc-500 mb-3" />
                      <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                        No saved replies yet. The paragraph you find yourself writing over and over —
                        post-operative feeding, when a limp warrants an X-ray — belongs here.
                      </p>
                    </div>
                  ) : vet.replies.map(r => (
                    <div key={r.id} className="glass-card rounded-2xl p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm">{r.title}</h3>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Used {r.uses} {r.uses === 1 ? 'time' : 'times'}
                          </p>
                        </div>
                        <button
                          onClick={() => deleteReply(r.id)}
                          className="text-zinc-500 hover:text-[#FF6B81] shrink-0 p-1"
                          title="Delete this reply"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <p className="text-sm text-zinc-400 mt-3 whitespace-pre-wrap">{r.body}</p>
                    </div>
                  ))}
                </div>

                <div className="glass-card rounded-2xl p-5">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Plus size={15} className="text-zinc-400" /> New saved reply
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Only you can see these. They appear as one-click buttons above the composer on
                    every question in the queue.
                  </p>
                  <div className="mt-4 space-y-3">
                    <Field label="Name" placeholder="e.g. Post-op feeding"
                      value={newReply.title}
                      onChange={v => setNewReply(n => ({ ...n, title: v }))} />
                    <Field label="Reply" multiline
                      placeholder="The text that gets inserted into your answer."
                      value={newReply.body}
                      onChange={v => setNewReply(n => ({ ...n, body: v }))} />
                    <button onClick={addReply} disabled={savingReply}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                      <Save size={15} /> {savingReply ? 'Saving…' : 'Save reply'}
                    </button>
                  </div>
                </div>
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

'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Stethoscope, Send, BadgeCheck, MessageCircleQuestion, ChevronDown, Lock,
  Sparkles, ShieldAlert, CircleCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import PageHeader from '@/components/layout/PageHeader'
import { formatRelative } from '@/lib/utils'
import { SPECIES_LABELS, toSpecies, type PetSpecies } from '@/lib/types'

/**
 * Ask a Vet — the feature that makes PetPal two-sided.
 *
 * Owners post a question; VERIFIED veterinary professionals answer it. Every
 * question is public, because the useful property of a Q&A archive is that most
 * owners are asking something another owner already asked.
 *
 * Two things are deliberate:
 *
 *   1. Only a verified vet can answer, and that rule lives in a row-level
 *      security policy rather than in this component. If it were enforced here,
 *      anyone could post clinical advice carrying a vet badge by calling the
 *      API directly.
 *   2. Nothing here replaces an examination. Urgent cases are pushed to the vet
 *      finder rather than left waiting on a reply, and the page says so.
 */

interface AnswerRow {
  id: string
  body: string
  created_at: string
  vetName: string
  vetPractice: string | null
  verified: boolean
}

interface QuestionRow {
  id: string
  title: string
  body: string
  species: PetSpecies
  answer_count: number
  created_at: string
  answers?: AnswerRow[]
}

/** Shown until the database is connected, and clearly labelled as examples. */
const SEED: QuestionRow[] = [
  {
    id: 'seed-1',
    title: 'My beagle keeps scratching but I can’t find any fleas',
    body: 'He’s been scratching around his neck and base of the tail for about two weeks. I’ve combed him thoroughly and found nothing. His skin looks slightly pink but not broken.',
    species: 'dog', answer_count: 1, created_at: new Date(Date.now() - 5400_000).toISOString(),
    answers: [{
      id: 'a1', created_at: new Date(Date.now() - 3600_000).toISOString(),
      vetName: 'Dr. Naledi Mahlangu', vetPractice: 'Greenside Animal Hospital', verified: true,
      body: 'Itching without visible fleas is very often environmental or food allergy rather than parasites — flea dirt can also be missed if the burden is low. Try a damp white paper test: comb onto wet white paper and look for reddish-brown specks. If that’s clear, ask your vet about a diet trial and a skin check, since the neck and tail base pattern is worth examining directly.',
    }],
  },
  {
    id: 'seed-2',
    title: 'Is it normal for a kitten to breathe quickly while asleep?',
    body: 'She’s 11 weeks, eating well and very playful. While she sleeps her breathing looks fast but she seems completely fine awake.',
    species: 'cat', answer_count: 1, created_at: new Date(Date.now() - 86400_000).toISOString(),
    answers: [{
      id: 'a2', created_at: new Date(Date.now() - 72000_000).toISOString(),
      vetName: 'Dr. Idris Patel', vetPractice: 'Melville Veterinary Clinic', verified: true,
      body: 'Kittens do breathe faster than adult cats, and rates rise further in active sleep. As a rough guide, count breaths over 30 seconds while she is settled and double it — under about 40 at rest is usually unremarkable at that age. What would concern me is effort rather than rate: belly heaving, open-mouth breathing, or blue-tinged gums all mean same-day attention.',
    }],
  },
  {
    id: 'seed-3',
    title: 'How soon can my rabbit go outside after vaccination?',
    body: 'He had his RHDV2 and myxomatosis jabs on Tuesday. I have a secure run but want to be sure about timing.',
    species: 'rabbit', answer_count: 0, created_at: new Date(Date.now() - 172800_000).toISOString(),
    answers: [],
  },
]

const SPECIES_CHOICES: PetSpecies[] = ['dog', 'cat', 'bird', 'rabbit', 'fish', 'reptile', 'small', 'other']

type Viewer =
  | { kind: 'loading' }
  | { kind: 'anon' }
  | { kind: 'owner'; id: string }
  | { kind: 'vet'; id: string; verified: boolean }

export default function AskPage() {
  const [questions, setQuestions] = useState<QuestionRow[]>(SEED)
  const [loadState, setLoadState] = useState<'loading' | 'live' | 'offline'>('loading')
  const [viewer, setViewer] = useState<Viewer>({ kind: 'loading' })
  const [open, setOpen] = useState<string | null>(SEED[0].id)

  // Composer
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [species, setSpecies] = useState<PetSpecies>('dog')
  const [posting, setPosting] = useState(false)

  // Vet answer drafts, keyed by question id, so switching between questions
  // doesn't lose what has been typed.
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [answering, setAnswering] = useState<string | null>(null)

  // ── Who is looking? ───────────────────────────────────────────────────────
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { tryCreateClient } = await import('@/lib/supabase/client')
        const supabase = tryCreateClient()
        if (!supabase) { if (active) setViewer({ kind: 'anon' }); return }

        const { data } = await supabase.auth.getUser()
        const user = data.user
        if (!user) { if (active) setViewer({ kind: 'anon' }); return }

        const { data: vet } = await supabase
          .from('vet_profiles').select('verified').eq('id', user.id).maybeSingle()

        if (!active) return
        if (vet) setViewer({ kind: 'vet', id: user.id, verified: Boolean(vet.verified) })
        else setViewer({ kind: 'owner', id: user.id })
      } catch {
        if (active) setViewer({ kind: 'anon' })
      }
    })()
    return () => { active = false }
  }, [])

  // ── Load questions and their answers ──────────────────────────────────────
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { tryCreateClient } = await import('@/lib/supabase/client')
        const supabase = tryCreateClient()
        if (!supabase) { if (active) setLoadState('offline'); return }

        const { data: qs, error } = await supabase
          .from('questions').select('*').order('created_at', { ascending: false }).limit(40)

        if (!active) return
        if (error || !qs || qs.length === 0) { setLoadState('offline'); return }

        const ids = qs.map((q: { id: string }) => q.id)
        const { data: as } = await supabase
          .from('answers')
          .select('id, question_id, body, created_at, vet_profiles(full_name, practice_name, verified)')
          .in('question_id', ids)
          .order('created_at', { ascending: true })

        if (!active) return

        const byQuestion = new Map<string, AnswerRow[]>()
        for (const a of (as ?? []) as unknown as Array<{
          id: string; question_id: string; body: string; created_at: string
          vet_profiles: { full_name: string; practice_name: string | null; verified: boolean } | null
        }>) {
          const list = byQuestion.get(a.question_id) ?? []
          list.push({
            id: a.id, body: a.body, created_at: a.created_at,
            vetName: a.vet_profiles?.full_name ?? 'Veterinary professional',
            vetPractice: a.vet_profiles?.practice_name ?? null,
            verified: Boolean(a.vet_profiles?.verified),
          })
          byQuestion.set(a.question_id, list)
        }

        setQuestions(qs.map((q: Record<string, unknown>) => ({
          id: String(q.id),
          title: String(q.title),
          body: String(q.body),
          species: toSpecies(q.species),
          answer_count: Number(q.answer_count ?? 0),
          created_at: String(q.created_at),
          answers: byQuestion.get(String(q.id)) ?? [],
        })))
        setOpen(String(qs[0].id))
        setLoadState('live')
      } catch {
        if (active) setLoadState('offline')
      }
    })()
    return () => { active = false }
  }, [])

  const canAsk = viewer.kind === 'owner' || viewer.kind === 'vet'

  async function ask() {
    const t = title.trim()
    const b = body.trim()
    if (t.length < 10) { toast.error('Give the question a clearer title — at least 10 characters.'); return }
    if (b.length < 20) { toast.error('Add a little more detail — at least 20 characters.'); return }
    if (!canAsk || posting) return

    setPosting(true)
    try {
      const { tryCreateClient } = await import('@/lib/supabase/client')
      const supabase = tryCreateClient()
      if (!supabase) {
        toast.error('Not connected', { description: 'The question board isn’t reachable right now.' })
        return
      }
      const { data, error } = await supabase
        .from('questions')
        .insert({ asker_id: viewer.id, title: t, body: b, species })
        .select().single()

      if (error || !data) {
        toast.error('Couldn’t post that', { description: error?.message ?? 'Please try again.' })
        return
      }

      setQuestions(p => [{
        id: data.id, title: t, body: b, species,
        answer_count: 0, created_at: data.created_at, answers: [],
      }, ...p])
      setOpen(data.id)
      setTitle(''); setBody('')
      toast.success('Question posted', { description: 'A verified vet will answer when they can.' })
    } catch {
      toast.error('Couldn’t post that', { description: 'Please check your connection and try again.' })
    } finally {
      setPosting(false)
    }
  }

  /** Post a verified vet's answer to one question. */
  async function answer(questionId: string) {
    const text = (drafts[questionId] ?? '').trim()
    if (text.length < 20) { toast.error('Give the owner a little more to work with — at least 20 characters.'); return }
    if (viewer.kind !== 'vet' || !viewer.verified || answering) return

    setAnswering(questionId)
    try {
      const { tryCreateClient } = await import('@/lib/supabase/client')
      const supabase = tryCreateClient()
      if (!supabase) {
        toast.error('Not connected', { description: 'The question board isn’t reachable right now.' })
        return
      }

      const { data, error } = await supabase
        .from('answers')
        .insert({ question_id: questionId, vet_id: viewer.id, body: text })
        .select().single()

      if (error || !data) {
        // The most likely cause is the RLS policy refusing an unverified account.
        toast.error('Couldn’t post that answer', {
          description: error?.message ?? 'Your account may not be verified yet.',
        })
        return
      }

      const { data: me } = await supabase
        .from('vet_profiles').select('full_name, practice_name, verified').eq('id', viewer.id).maybeSingle()

      setQuestions(p => p.map(q => q.id === questionId ? {
        ...q,
        answer_count: q.answer_count + 1,
        answers: [...(q.answers ?? []), {
          id: data.id, body: text, created_at: data.created_at,
          vetName: me?.full_name ?? 'You',
          vetPractice: me?.practice_name ?? null,
          verified: Boolean(me?.verified),
        }],
      } : q))
      setDrafts(d => ({ ...d, [questionId]: '' }))
      toast.success('Answer posted')
    } catch {
      toast.error('Couldn’t post that answer', { description: 'Please check your connection and try again.' })
    } finally {
      setAnswering(null)
    }
  }

  const unanswered = useMemo(() => questions.filter(q => (q.answers?.length ?? 0) === 0).length, [questions])

  return (
    <div className="relative min-h-screen">
      <PageHeader
        eyebrow="Ask a vet"
        icon={Stethoscope}
        title="Questions answered by"
        accent="real vets."
        sub="Post a question about your pet and a verified veterinary professional will answer it. Every answer is public, because the question you have is usually one someone else has already asked."
        species="bird"
      />

      <div className="relative px-6 lg:px-8 py-10 max-w-4xl mx-auto">
        {/* Safety rail — this must never read as an emergency service. */}
        <div className="rounded-2xl p-4 mb-8 border border-[#FF6B81]/25 bg-[#FF6B81]/[0.07] flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-[#FF6B81] shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="text-sm font-semibold text-[#FF6B81] mb-1">This is not an emergency service</div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Answers can take hours or days, and no vet can diagnose without examining your pet. If something is
              wrong right now — difficulty breathing, collapse, suspected poisoning, a swollen hard belly —{' '}
              <Link href="/vet-finder" className="text-[#FFD98E] underline underline-offset-2">
                find a practice near you
              </Link>{' '}
              instead of waiting for a reply.
            </p>
          </div>
        </div>

        {/* ── Composer ── */}
        <div className="rounded-[1.25rem] border border-white/[0.09] bg-[var(--card)]/80 backdrop-blur-xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-5">
            <MessageCircleQuestion className="w-4 h-4 text-[var(--apricot)]" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Ask a question</h2>
          </div>

          {viewer.kind === 'anon' ? (
            <div className="flex items-start gap-3 text-sm text-zinc-400">
              <Lock className="w-4 h-4 shrink-0 mt-0.5 text-zinc-500" aria-hidden="true" />
              <p className="leading-relaxed">
                <Link href="/auth/signup" className="text-[var(--apricot)] underline underline-offset-2">Create a free account</Link>{' '}
                or <Link href="/auth/login" className="text-[var(--apricot)] underline underline-offset-2">sign in</Link>{' '}
                to ask a question. Reading is open to everyone.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Summarise it in one line — e.g. “My kitten won’t use the litter tray”"
                maxLength={140}
                className="bg-[var(--bg)] border-white/10 focus:border-[var(--apricot)]/45 h-11"
                aria-label="Question title"
              />
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="What have you noticed, for how long, and what have you already tried? Age, species and any medication all help."
                rows={4}
                maxLength={1200}
                className="w-full rounded-xl bg-[var(--bg)] border border-white/10 focus:border-[var(--apricot)]/45 focus:outline-none p-3.5 text-sm leading-relaxed resize-none placeholder:text-zinc-600"
                aria-label="Question detail"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {SPECIES_CHOICES.map(s => (
                    <button
                      key={s}
                      onClick={() => setSpecies(s)}
                      aria-pressed={species === s}
                      className={`px-2.5 py-1 rounded-full text-[11px] border transition-all ${
                        species === s
                          ? 'bg-[var(--apricot)]/15 border-[var(--apricot)]/40 text-[var(--apricot)]'
                          : 'bg-white/[0.03] border-white/10 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {SPECIES_LABELS[s]}
                    </button>
                  ))}
                </div>
                <Button onClick={ask} disabled={posting} className="btn-glass-primary rounded-xl gap-2 h-9 text-sm">
                  <Send className="w-3.5 h-3.5" /> {posting ? 'Posting…' : 'Post question'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Vet status ── */}
        {viewer.kind === 'vet' && (
          <div className={`rounded-xl p-3.5 mb-6 flex items-start gap-2.5 text-xs border ${
            viewer.verified
              ? 'border-[#8FD9A8]/30 bg-[#8FD9A8]/[0.07] text-zinc-200'
              : 'border-[#FFD98E]/30 bg-[#FFD98E]/[0.07] text-zinc-200'
          }`}>
            {viewer.verified
              ? <CircleCheck className="w-4 h-4 text-[#8FD9A8] shrink-0 mt-px" aria-hidden="true" />
              : <Sparkles className="w-4 h-4 text-[#FFD98E] shrink-0 mt-px" aria-hidden="true" />}
            <span className="leading-relaxed">
              {viewer.verified
                ? 'Your professional account is verified — you can answer questions below.'
                : 'Your professional account is awaiting verification. An administrator checks your registration number against the register before answers can be posted.'}
            </span>
          </div>
        )}

        {loadState === 'offline' && (
          <div className="rounded-xl p-3.5 mb-6 flex items-start gap-2.5 text-xs text-zinc-400 border border-white/10 bg-white/[0.02]">
            <Sparkles className="w-4 h-4 text-[#FFD98E] shrink-0 mt-px" aria-hidden="true" />
            <span className="leading-relaxed">
              Showing example questions — the live board isn&rsquo;t reachable, so nothing posted here will be saved.
            </span>
          </div>
        )}

        {/* ── Board ── */}
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-300">
            {questions.length} {questions.length === 1 ? 'question' : 'questions'}
          </h2>
          {unanswered > 0 && (
            <span className="text-[11px] text-zinc-500">{unanswered} awaiting an answer</span>
          )}
        </div>

        <div className="space-y-3">
          {questions.map(q => {
            const isOpen = open === q.id
            const answers = q.answers ?? []
            return (
              <div
                key={q.id}
                className="rounded-[1.25rem] border border-white/[0.08] bg-[var(--card)]/75 backdrop-blur-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : q.id)}
                  aria-expanded={isOpen}
                  className="w-full text-left p-5 flex items-start gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge className="bg-white/[0.05] text-zinc-300 border-white/10 text-[10px]">
                        {SPECIES_LABELS[q.species]}
                      </Badge>
                      {answers.length > 0 ? (
                        <Badge className="bg-[#8FD9A8]/12 text-[#8FD9A8] border-[#8FD9A8]/25 text-[10px] gap-1">
                          <BadgeCheck className="w-3 h-3" /> Answered
                        </Badge>
                      ) : (
                        <Badge className="bg-[#FFD98E]/12 text-[#FFD98E] border-[#FFD98E]/25 text-[10px]">
                          Awaiting a vet
                        </Badge>
                      )}
                      <span className="text-[11px] text-zinc-600">{formatRelative(q.created_at)}</span>
                    </div>
                    <h3 className="text-[15.5px] font-medium text-zinc-100 leading-snug">{q.title}</h3>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-500 shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5">
                        <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap border-l-2 border-white/10 pl-4 mb-5">
                          {q.body}
                        </p>

                        {answers.length === 0 ? (
                          <p className="text-xs text-zinc-600 italic">
                            No answer yet. Verified vets answer in their own time — this is not a queue anyone is paid
                            to clear.
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {answers.map(a => (
                              <div key={a.id} className="rounded-xl border border-[#8FD9A8]/18 bg-[#8FD9A8]/[0.04] p-4">
                                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                                  <span className="w-7 h-7 rounded-lg bg-[#8FD9A8]/12 border border-[#8FD9A8]/25 flex items-center justify-center shrink-0">
                                    <Stethoscope className="w-3.5 h-3.5 text-[#8FD9A8]" aria-hidden="true" />
                                  </span>
                                  <span className="text-sm font-semibold text-zinc-100">{a.vetName}</span>
                                  {a.verified && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-[#8FD9A8]">
                                      <BadgeCheck className="w-3.5 h-3.5" /> Verified vet
                                    </span>
                                  )}
                                  {a.vetPractice && (
                                    <span className="text-[11px] text-zinc-500">· {a.vetPractice}</span>
                                  )}
                                  <span className="text-[11px] text-zinc-600 ml-auto">{formatRelative(a.created_at)}</span>
                                </div>
                                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{a.body}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Only a verified vet sees this. The database enforces
                            the same rule, so hiding it is convenience, not
                            security. */}
                        {viewer.kind === 'vet' && viewer.verified && (
                          <div className="mt-5 pt-5 border-t border-white/[0.07]">
                            <label
                              htmlFor={`answer-${q.id}`}
                              className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 block mb-2.5"
                            >
                              Your answer
                            </label>
                            <textarea
                              id={`answer-${q.id}`}
                              value={drafts[q.id] ?? ''}
                              onChange={e => setDrafts(d => ({ ...d, [q.id]: e.target.value }))}
                              placeholder="Give the owner something they can act on: what it is likely to be, what to watch for, and when it needs a consultation."
                              rows={4}
                              maxLength={2000}
                              className="w-full rounded-xl bg-[var(--bg)] border border-white/10 focus:border-[#8FD9A8]/45 focus:outline-none p-3.5 text-sm leading-relaxed resize-none placeholder:text-zinc-600"
                            />
                            <div className="flex items-center justify-between mt-3">
                              <span className="text-[11px] text-zinc-600">
                                Posted publicly under your verified name.
                              </span>
                              <Button
                                onClick={() => answer(q.id)}
                                disabled={answering === q.id}
                                className="btn-glass-primary rounded-xl gap-2 h-9 text-sm"
                              >
                                <Send className="w-3.5 h-3.5" />
                                {answering === q.id ? 'Posting…' : 'Post answer'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        <p className="text-[11px] text-zinc-600 leading-relaxed mt-8 text-center max-w-lg mx-auto">
          Answers are general guidance from registered professionals who have not examined your animal. They do not
          replace a consultation, and nothing here is a prescription.
        </p>
      </div>
    </div>
  )
}

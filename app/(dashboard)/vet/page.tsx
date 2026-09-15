'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Stethoscope, ShieldCheck, Clock, MessageSquare, ArrowRight, AlertCircle } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'

/**
 * The veterinary professional's console.
 *
 * ── Why a vet is not a separate kind of account ─────────────────────────────
 * A vet is a pet owner who ALSO happens to be a vet. Most of them have animals
 * of their own, and a professional signing up should not lose the nutrition
 * planner and the food-safety checker just because they ticked "veterinary
 * professional". So there is one account type, with every owner tool available
 * to everybody, and this console is an additional surface that appears only for
 * professionals. That also answers the awkward case cleanly: an owner who is
 * also a vet is one account, not two.
 *
 * ── Verification ────────────────────────────────────────────────────────────
 * Registering is a claim, not a credential. A new professional lands here
 * unverified and can see the queue but not answer, until an administrator
 * checks the registration number against the register. A fake vet answer is
 * worse than no answer, which is the whole reason the gate exists in the
 * database rather than only in this page — see the "verified vets answer"
 * policy in supabase/schema.sql.
 */

interface QueueItem {
  id: string
  title: string
  species: string
  created_at: string
  answer_count: number
}

type State =
  | { kind: 'loading' }
  | { kind: 'anon' }
  | { kind: 'not-a-vet' }
  | { kind: 'offline' }
  | {
      kind: 'vet'
      verified: boolean
      fullName: string
      practice: string | null
      registration: string | null
      unanswered: QueueItem[]
      answered: number
    }

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function VetConsolePage() {
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { tryCreateClient } = await import('@/lib/supabase/client')
        const supabase = tryCreateClient()
        if (!supabase) {
          if (!cancelled) setState({ kind: 'offline' })
          return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (!cancelled) setState({ kind: 'anon' })
          return
        }

        const { data: profile } = await supabase
          .from('vet_profiles')
          .select('full_name, practice_name, registration_no, verified')
          .eq('id', user.id)
          .maybeSingle()

        if (!profile) {
          if (!cancelled) setState({ kind: 'not-a-vet' })
          return
        }

        // Questions nobody has answered yet — the actual work queue.
        const { data: questions } = await supabase
          .from('questions')
          .select('id, title, species, created_at, answer_count')
          .eq('answer_count', 0)
          .order('created_at', { ascending: false })
          .limit(25)

        const { count } = await supabase
          .from('answers')
          .select('id', { count: 'exact', head: true })
          .eq('vet_id', user.id)

        if (cancelled) return
        setState({
          kind: 'vet',
          verified: Boolean(profile.verified),
          fullName: profile.full_name,
          practice: profile.practice_name,
          registration: profile.registration_no,
          unanswered: (questions ?? []) as QueueItem[],
          answered: count ?? 0,
        })
      } catch {
        if (!cancelled) setState({ kind: 'offline' })
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-screen">
      <PageHeader
        eyebrow="Professional"
        title="Vet"
        accent="console"
        sub="Your verification status and the questions waiting for a professional answer."
        species="bird"
      />

      <div className="max-w-5xl mx-auto px-6 pb-24 -mt-4">
        {state.kind === 'loading' && (
          <div className="glass-card rounded-2xl p-8 text-center text-zinc-400">Loading your console…</div>
        )}

        {state.kind === 'offline' && (
          <Notice
            icon={AlertCircle}
            title="The database isn’t reachable"
            body="Your console needs the database. Check /setup for the exact problem."
          />
        )}

        {state.kind === 'anon' && (
          <Notice
            icon={AlertCircle}
            title="Sign in to use the console"
            body="This area is for registered veterinary professionals."
            action={{ href: '/auth/login', label: 'Sign in' }}
          />
        )}

        {state.kind === 'not-a-vet' && (
          <Notice
            icon={Stethoscope}
            title="This is a professional area"
            body="Your account isn’t registered as a veterinary professional. Everything else in PetPal is open to you as normal — the owner tools are all in the sidebar."
            action={{ href: '/dashboard', label: 'Back to your dashboard' }}
          />
        )}

        {state.kind === 'vet' && (
          <div className="space-y-6">
            {/* Verification status is the first thing a professional needs. */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-6"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${
                    state.verified ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                  }`}
                >
                  {state.verified ? <ShieldCheck size={20} /> : <Clock size={20} />}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">
                    {state.verified ? 'Verified professional' : 'Verification pending'}
                  </h2>
                  <p className="text-sm text-zinc-400 mt-1">
                    {state.verified
                      ? 'Your answers appear with a verified badge beside them.'
                      : 'An administrator checks your registration number against the register before you can answer. Until then you can read the queue but not reply — an unverified answer would carry the weight of a professional one without the backing.'}
                  </p>
                  <dl className="mt-4 grid sm:grid-cols-3 gap-3 text-sm">
                    <Detail label="Name" value={state.fullName} />
                    <Detail label="Practice" value={state.practice ?? 'Not given'} />
                    <Detail label="Registration" value={state.registration ?? 'Not given'} />
                  </dl>
                </div>
              </div>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Stat label="Waiting for an answer" value={state.unanswered.length} />
              <Stat label="Answers you’ve given" value={state.answered} />
            </div>

            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Unanswered questions</h2>
                <Link href="/ask" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                  Open Ask a Vet <ArrowRight size={14} />
                </Link>
              </div>

              {state.unanswered.length === 0 ? (
                <p className="text-sm text-zinc-400">
                  Nothing waiting. Every question has at least one answer.
                </p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {state.unanswered.map(q => (
                    <li key={q.id} className="py-3 flex items-start gap-3">
                      <MessageSquare size={16} className="text-zinc-500 mt-1 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{q.title}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {q.species} · {timeAgo(q.created_at)}
                        </p>
                      </div>
                      <Link
                        href="/ask"
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 shrink-0"
                      >
                        {state.verified ? 'Answer' : 'View'}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="text-sm mt-0.5 truncate">{value}</dd>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-zinc-400 mt-1">{label}</div>
    </div>
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
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm"
        >
          {action.label} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  )
}

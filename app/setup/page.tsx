'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw, Database, KeyRound, Table2, ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Logo from '@/components/public/Logo'
import { checkSupabaseHealth, type HealthReport } from '@/lib/supabase/errors'

/**
 * Connection diagnostics.
 *
 * "Failed to fetch" on the sign-in screen is useless on its own — it could be a
 * missing variable, a typo in the project URL, a paused project or a missing
 * table. This page runs each check separately and names the exact thing to fix,
 * so setting the project up on a fresh Supabase account is a matter of working
 * down the list until everything is green.
 *
 * It only ever reads the PUBLIC anon key, which is safe to expose — it is
 * shipped in the browser bundle by design and is governed by row-level security.
 */

type Status = 'pending' | 'ok' | 'warn' | 'fail'

interface Check {
  id: string
  label: string
  status: Status
  detail: string
  fix?: string
}

const TABLES = ['profiles', 'pets', 'confessions'] as const

function StatusIcon({ status }: { status: Status }) {
  if (status === 'pending') return <Loader2 className="w-5 h-5 text-zinc-500 animate-spin shrink-0" />
  if (status === 'ok') return <CheckCircle2 className="w-5 h-5 text-[#8FD9A8] shrink-0" />
  if (status === 'warn') return <AlertTriangle className="w-5 h-5 text-[#FFD98E] shrink-0" />
  return <XCircle className="w-5 h-5 text-[#FF6B81] shrink-0" />
}

export default function SetupPage() {
  const [checks, setChecks] = useState<Check[]>([])
  // Starts true: the first run is kicked off on mount, so there is no idle
  // frame and no synchronous setState inside the effect.
  const [running, setRunning] = useState(true)
  const [health, setHealth] = useState<HealthReport | null>(null)

  async function run(markRunning = true) {
    if (markRunning) setRunning(true)
    // Yield once so the first state update lands outside the effect’s
    // synchronous body when this is called on mount.
    await Promise.resolve()
    const results: Check[] = []

    // ── 1. Environment variables ─────────────────────────────────────────
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    results.push({
      id: 'env-url',
      label: 'NEXT_PUBLIC_SUPABASE_URL is set',
      status: url ? 'ok' : 'fail',
      detail: url ? url : 'Not set.',
      fix: url ? undefined : 'Add it in Vercel → Settings → Environment Variables, then redeploy.',
    })

    results.push({
      id: 'env-key',
      label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is set',
      status: key ? 'ok' : 'fail',
      detail: key ? `Present (${key.length} characters)` : 'Not set.',
      fix: key ? undefined : 'Add it in Vercel → Settings → Environment Variables, then redeploy.',
    })

    const urlShapeOk = Boolean(url && /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(url.trim()))
    results.push({
      id: 'env-url-shape',
      label: 'The URL looks like a Supabase project URL',
      status: !url ? 'fail' : urlShapeOk ? 'ok' : 'fail',
      detail: !url
        ? 'No URL to check.'
        : urlShapeOk
          ? 'Correct shape.'
          : 'Expected https://<project-ref>.supabase.co with no trailing path.',
      fix: urlShapeOk ? undefined : 'Copy it exactly from Supabase → Project Settings → Data API → Project URL.',
    })

    setChecks([...results])

    // ── 2. Can we reach the project? ─────────────────────────────────────
    const report = await checkSupabaseHealth()
    setHealth(report)

    results.push({
      id: 'reach',
      label: 'The Supabase project responds',
      status: report.reachable ? 'ok' : 'fail',
      detail: report.message,
      fix: report.reachable
        ? undefined
        : 'Open your Supabase dashboard. If the project shows "Paused", click Restore. If it isn’t there at all, create a new project and update the two variables above.',
    })

    results.push({
      id: 'key',
      label: 'The anon key is accepted',
      status: !report.reachable ? 'pending' : report.keyAccepted ? 'ok' : 'fail',
      detail: !report.reachable
        ? 'Skipped — the project has to respond first.'
        : report.keyAccepted
          ? 'Accepted.'
          : `Rejected (HTTP ${report.status}).`,
      fix: report.keyAccepted || !report.reachable
        ? undefined
        : 'Re-copy the anon / publishable key from Supabase → Project Settings → API Keys.',
    })

    setChecks([...results])

    // ── 3. Do the tables exist? ──────────────────────────────────────────
    if (report.reachable && report.keyAccepted) {
      for (const table of TABLES) {
        let status: Status = 'fail'
        let detail = ''
        try {
          const { tryCreateClient } = await import('@/lib/supabase/client')
          const supabase = tryCreateClient()
          if (!supabase) throw new Error('no client')
          const { error } = await supabase.from(table).select('*', { count: 'exact', head: true })
          if (!error) {
            status = 'ok'
            detail = 'Table exists and is readable.'
          } else if (/does not exist|schema cache|relation/i.test(error.message)) {
            status = 'fail'
            detail = 'Table not found.'
          } else {
            // Present but RLS is blocking an anonymous read — that is correct
            // for a private table, not a setup failure.
            status = 'warn'
            detail = `Reachable, but blocked by row-level security: ${error.message}`
          }
        } catch (e) {
          detail = e instanceof Error ? e.message : 'Query failed.'
        }

        results.push({
          id: `table-${table}`,
          label: `Table "${table}"`,
          status,
          detail,
          fix: status === 'fail' ? 'Run the SQL in SETUP.md → step 3 in the Supabase SQL Editor.' : undefined,
        })
        setChecks([...results])
      }
    }

    setRunning(false)
  }

  useEffect(() => {
    // `run` awaits before its first state update, so nothing is set during the
    // effect’s synchronous body. The rule flags any call into a function that
    // contains setState, regardless of the await, so it is suppressed here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void run(false)
  }, [])

  const failed = checks.filter(c => c.status === 'fail').length
  const allOk = checks.length > 0 && !running && failed === 0

  return (
    <div className="min-h-screen bg-[var(--bg)] px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2.5 mb-8">
          <Logo size={36} />
          <span className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Pet<span className="text-[#FFAE6D]">Pal</span>
          </span>
          <span className="text-xs text-zinc-500 ml-2 font-mono">setup check</span>
        </div>

        <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Connection diagnostics
        </h1>
        <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
          Every check below has to pass before sign-in and sign-up will work. Work down the list — each failure names
          the exact thing to fix. Full instructions are in <code className="text-[#FFAE6D]">SETUP.md</code>.
        </p>

        {allOk && (
          <div className="rounded-2xl p-4 mb-6 border border-[#8FD9A8]/30 bg-[#8FD9A8]/8 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#8FD9A8] shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-[#8FD9A8]">Everything is connected</div>
              <p className="text-xs text-zinc-300 mt-1">Sign-in and sign-up should work. </p>
            </div>
          </div>
        )}

        {!running && failed > 0 && (
          <div className="rounded-2xl p-4 mb-6 border border-[#FF6B81]/30 bg-[#FF6B81]/8 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-[#FF6B81] shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-[#FF6B81]">
                {failed} {failed === 1 ? 'check' : 'checks'} failed
              </div>
              <p className="text-xs text-zinc-300 mt-1">
                Sign-in will show &ldquo;Can&rsquo;t reach the database&rdquo; until these are fixed.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          {checks.map(c => (
            <div key={c.id} className="glass-card rounded-xl p-4 flex items-start gap-3">
              <StatusIcon status={c.status} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{c.label}</div>
                <div className="text-xs text-zinc-400 mt-1 break-words">{c.detail}</div>
                {c.fix && (
                  <div className="text-xs text-[#FFD98E] mt-2 leading-relaxed">
                    <span className="font-semibold">Fix: </span>{c.fix}
                  </div>
                )}
              </div>
            </div>
          ))}
          {running && (
            <div className="glass-card rounded-xl p-4 flex items-center gap-3 text-sm text-zinc-400">
              <Loader2 className="w-4 h-4 animate-spin" /> Running checks…
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mt-8">
          <Button onClick={() => void run()} disabled={running} className="btn-glass-primary rounded-xl gap-2">
            <RefreshCw className="w-4 h-4" /> Run again
          </Button>
          <Link href="/">
            <Button className="btn-glass text-white rounded-xl gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to site
            </Button>
          </Link>
        </div>

        <div className="mt-10 grid sm:grid-cols-3 gap-3 text-xs">
          {[
            { icon: KeyRound, title: 'Variables', body: 'Vercel → Settings → Environment Variables. Redeploy after any change — they are baked in at build time.' },
            { icon: Database, title: 'Project', body: 'Free Supabase projects pause after about a week of no traffic. Restoring one takes a minute.' },
            { icon: Table2, title: 'Tables', body: 'Run the whole script in SETUP.md once, in the Supabase SQL Editor.' },
          ].map(t => (
            <div key={t.title} className="glass-card rounded-xl p-3.5">
              <t.icon className="w-4 h-4 text-[#FFAE6D] mb-2" />
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1">{t.title}</div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">{t.body}</p>
            </div>
          ))}
        </div>

        {health?.url && (
          <p className="text-[11px] text-zinc-600 mt-6 font-mono break-all">
            Probing: {health.url}
          </p>
        )}
      </div>
    </div>
  )
}

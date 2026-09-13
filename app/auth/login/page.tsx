'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, ArrowRight, PawPrint } from 'lucide-react'
import Logo from '@/components/public/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useClientValue } from '@/lib/use-client-value'
import { describeSupabaseError } from '@/lib/supabase/errors'

/** Only ever follow an internal, single-slash path. */
function safeNext(next: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return '/dashboard'
  }
  return next
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  // Set when a failure is a setup problem rather than a wrong password, so we
  // can point at /setup instead of leaving the user retyping a correct password.
  const [configProblem, setConfigProblem] = useState(false)
  // Read the query string during render (a stable string) so this page stays
  // statically prerendered — `useSearchParams` would force a Suspense boundary.
  const search = useClientValue(() => window.location.search, '')
  const next = safeNext(new URLSearchParams(search).get('next'))

  useEffect(() => {
    if (new URLSearchParams(search).get('error') === 'auth_callback_failed') {
      toast.error('That sign-in link didn’t work', {
        description: 'It may have expired. Please sign in again.',
      })
    }
  }, [search])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) { toast.error('Please fill in both fields'); return }
    setLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password })
      if (error) {
        const f = describeSupabaseError(error)
        toast.error(f.title, { description: f.detail })
        setConfigProblem(f.isConfig)
        setLoading(false)
        return
      }
      toast.success('Welcome back.')
      // Keep `loading` true — we are navigating away.
      window.location.href = next
    } catch (err) {
      // "Failed to fetch" lands here: the request never reached Supabase.
      const f = describeSupabaseError(err)
      toast.error(f.title, { description: f.detail })
      setConfigProblem(f.isConfig)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0A14] flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-full opacity-30" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,174,109,0.08) 0%, transparent 70%)' }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <Logo size={38} glow />
          <span className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Pet<span className="text-[#FFAE6D]">Pal</span>
          </span>
        </div>

        {configProblem && (
          <div className="mb-4 rounded-xl p-3.5 border border-[#FFD98E]/30 bg-[#FFD98E]/8 text-xs text-zinc-200 leading-relaxed">
            This looks like a configuration problem rather than a wrong password.{' '}
            <Link href="/setup" className="text-[#FFD98E] underline underline-offset-2">Run the setup check</Link>{' '}
            to see exactly what&rsquo;s missing.
          </div>
        )}

        <div className="p-8 glass-card rounded-2xl">
          <h1 className="text-3xl font-black mb-2" style={{ fontFamily: 'var(--font-display)' }}>SIGN IN</h1>
          <p className="text-[#A79CBF] mb-8 text-sm">Welcome back to your pets.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#A79CBF] uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A79CBF]" />
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 bg-[#0D0A14] border-white/10 focus:border-[#FFAE6D]/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#A79CBF] uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A79CBF]" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 bg-[#0D0A14] border-white/10 focus:border-[#FFAE6D]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A79CBF] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full btn-glass-primary h-12 text-base font-semibold rounded-xl"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/8 flex items-center justify-between text-sm">
            <Link href="/auth/forgot-password" className="text-[#A79CBF] hover:text-[#FFAE6D] transition-colors">
              Forgot password?
            </Link>
            <Link href="/auth/signup" className="text-[#FFAE6D] hover:text-[#8E8BF5] transition-colors font-medium">
              Create account
            </Link>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-[#FFAE6D]/5 border border-[#FFAE6D]/20">
          <PawPrint className="w-4 h-4 text-[#FFAE6D] mt-0.5 shrink-0" />
          <p className="text-xs text-[#A79CBF] leading-relaxed">
            Your pets&rsquo; profiles, nutrition plans and reminders — all waiting for you.
            PetPal keeps everything in one safe place.
          </p>
        </div>

        <p className="text-center mt-6 text-xs text-[#A79CBF]">
          <Link href="/" className="hover:text-white transition-colors">← Back to home</Link>
        </p>
      </motion.div>
    </div>
  )
}

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
        // Supabase returns a deliberately vague message for bad credentials;
        // surface something a human can act on.
        toast.error(
          /invalid login/i.test(error.message)
            ? 'That email and password don’t match an account.'
            : error.message
        )
        setLoading(false)
        return
      }
      toast.success('Welcome back.')
      // Keep `loading` true — we are navigating away.
      window.location.href = next
    } catch (err) {
      toast.error(
        err instanceof Error && err.message.includes('not configured')
          ? 'Sign-in is unavailable right now. Please try again later.'
          : 'Something went wrong. Please try again.'
      )
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0C0A0A] flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-full opacity-30" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,122,107,0.08) 0%, transparent 70%)' }} />

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
            Pet<span className="text-[#FF7A6B]">Pal</span>
          </span>
        </div>

        <div className="p-8 glass-card rounded-2xl">
          <h1 className="text-3xl font-black mb-2" style={{ fontFamily: 'var(--font-display)' }}>SIGN IN</h1>
          <p className="text-[#A79F9C] mb-8 text-sm">Welcome back to your pets.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#A79F9C] uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A79F9C]" />
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 bg-[#0C0A0A] border-white/10 focus:border-[#FF7A6B]/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#A79F9C] uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A79F9C]" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 bg-[#0C0A0A] border-white/10 focus:border-[#FF7A6B]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A79F9C] hover:text-white transition-colors"
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
            <Link href="/auth/forgot-password" className="text-[#A79F9C] hover:text-[#FF7A6B] transition-colors">
              Forgot password?
            </Link>
            <Link href="/auth/signup" className="text-[#FF7A6B] hover:text-[#2DD4BF] transition-colors font-medium">
              Create account
            </Link>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-[#FF7A6B]/5 border border-[#FF7A6B]/20">
          <PawPrint className="w-4 h-4 text-[#FF7A6B] mt-0.5 shrink-0" />
          <p className="text-xs text-[#A79F9C] leading-relaxed">
            Your pets&rsquo; profiles, nutrition plans and reminders — all waiting for you.
            PetPal keeps everything in one safe place.
          </p>
        </div>

        <p className="text-center mt-6 text-xs text-[#A79F9C]">
          <Link href="/" className="hover:text-white transition-colors">← Back to home</Link>
        </p>
      </motion.div>
    </div>
  )
}

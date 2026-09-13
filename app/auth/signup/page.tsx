'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, ArrowRight, PawPrint, User } from 'lucide-react'
import Logo from '@/components/public/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { describeSupabaseError } from '@/lib/supabase/errors'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [configProblem, setConfigProblem] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { toast.error('Email and password required'); return }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || 'Pet Parent' },
        },
      })
      if (error) {
        const f = describeSupabaseError(error)
        toast.error(f.title, { description: f.detail })
        setConfigProblem(f.isConfig)
        return
      }
      setDone(true)
    } catch (err) {
      // "Failed to fetch" lands here: the request never reached Supabase.
      const f = describeSupabaseError(err)
      toast.error(f.title, { description: f.detail })
      setConfigProblem(f.isConfig)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#0D0A14] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-full bg-[#FFAE6D]/10 border border-[#FFAE6D]/30 flex items-center justify-center mx-auto mb-6">
            <PawPrint className="w-8 h-8 text-[#FFAE6D]" />
          </div>
          <h1 className="text-3xl font-black mb-4" style={{ fontFamily: 'var(--font-display)' }}>CHECK YOUR EMAIL</h1>
          <p className="text-[#A79CBF] leading-relaxed">
            We sent a confirmation link to <span className="text-white">{email}</span>.
            Verify it to start caring for your pets with PetPal.
          </p>
          <Link href="/auth/login">
            <Button className="mt-8 btn-glass-primary rounded-xl">
              Back to Sign In
            </Button>
          </Link>
        </motion.div>
      </div>
    )
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
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <Logo size={38} glow />
          <span className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Pet<span className="text-[#FFAE6D]">Pal</span>
          </span>
        </div>

        {configProblem && (
          <div className="mb-4 rounded-xl p-3.5 border border-[#FFD98E]/30 bg-[#FFD98E]/8 text-xs text-zinc-200 leading-relaxed">
            This looks like a configuration problem, not something you did.{' '}
            <Link href="/setup" className="text-[#FFD98E] underline underline-offset-2">Run the setup check</Link>{' '}
            to see exactly what&rsquo;s missing.
          </div>
        )}

        <div className="p-8 glass-card rounded-2xl">
          <h1 className="text-3xl font-black mb-2" style={{ fontFamily: 'var(--font-display)' }}>CREATE ACCOUNT</h1>
          <p className="text-[#A79CBF] mb-8 text-sm">Join 120,000+ pet parents who care smarter.</p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#A79CBF] uppercase tracking-wider">Your Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A79CBF]" />
                <Input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="pl-10 bg-[#0D0A14] border-white/10 focus:border-[#FFAE6D]/50"
                />
              </div>
            </div>

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
                  placeholder="Min. 8 characters"
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
              {loading ? 'Creating account...' : 'Create Account'}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>

          <p className="text-center mt-6 text-sm text-[#A79CBF]">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-[#FFAE6D] hover:text-[#8E8BF5] transition-colors">Sign in</Link>
          </p>
        </div>

        <p className="text-center mt-6 text-xs text-[#A79CBF]">
          <Link href="/" className="hover:text-white transition-colors">← Back to home</Link>
        </p>
      </motion.div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, ArrowRight, PawPrint, User, Stethoscope, Building2, BadgeCheck } from 'lucide-react'
import Logo from '@/components/public/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { describeSupabaseError } from '@/lib/supabase/errors'

/**
 * PetPal has two kinds of account:
 *
 *   owner — uses the tools, tracks pets, asks questions
 *   vet   — everything an owner can do, plus answering questions on Ask a Vet
 *
 * A vet account is NOT trusted on sign-up. It is created unverified, and an
 * administrator checks the registration number against the professional
 * register before answers can be posted. The database enforces that, not this
 * form, because a self-declared "vet" badge on clinical advice is dangerous.
 */
type AccountKind = 'owner' | 'vet'

export default function SignupPage() {
  const [kind, setKind] = useState<AccountKind>('owner')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [practice, setPractice] = useState('')
  const [registration, setRegistration] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [configProblem, setConfigProblem] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { toast.error('Email and password required'); return }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (kind === 'vet' && !displayName.trim()) {
      toast.error('Professional accounts need your full name')
      return
    }
    if (kind === 'vet' && !registration.trim()) {
      toast.error('Enter your registration number so we can verify you')
      return
    }
    setLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName.trim() || (kind === 'vet' ? 'Veterinary professional' : 'Pet Parent'),
            role: kind === 'vet' ? 'vet' : 'user',
            // Carried in user metadata so the handle_new_user trigger can write
            // the vet_profiles row server-side. See the note below on why the
            // client cannot do it.
            practice_name: kind === 'vet' ? practice.trim() : '',
            registration_no: kind === 'vet' ? registration.trim() : '',
          },
        },
      })
      if (error) {
        const f = describeSupabaseError(error)
        toast.error(f.title, { description: f.detail })
        setConfigProblem(f.isConfig)
        return
      }

      /*
       * The professional record is NOT created here.
       *
       * This used to insert into vet_profiles straight after signUp, and it
       * failed every single time. With email confirmation on — Supabase's
       * default — signUp returns a user but no session, so auth.uid() is null
       * and the table's `with check (auth.uid() = id)` policy rejects the row.
       * The account was created, the professional details were lost, and the
       * vet could never be verified.
       *
       * The handle_new_user trigger writes it instead, from the metadata
       * above. It is SECURITY DEFINER, so it needs no session.
       */
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
          <p className="text-[#A79CBF] mb-6 text-sm">
            {kind === 'owner'
              ? 'Join 120,000+ pet parents who care smarter.'
              : 'Answer owners’ questions and reach the people who need you.'}
          </p>

          {/* Account type */}
          <div className="grid grid-cols-2 gap-2 mb-6" role="radiogroup" aria-label="Account type">
            {([
              ['owner', 'Pet owner', PawPrint, 'Track pets and use every tool'],
              ['vet', 'Veterinary pro', Stethoscope, 'Answer questions as a verified vet'],
            ] as const).map(([k, label, Icon, hint]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  kind === k
                    ? 'bg-[#FFAE6D]/12 border-[#FFAE6D]/40'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/25'
                }`}
              >
                <Icon className={`w-4 h-4 mb-2 ${kind === k ? 'text-[#FFAE6D]' : 'text-zinc-500'}`} aria-hidden="true" />
                <div className={`text-[13px] font-semibold ${kind === k ? 'text-[#FFAE6D]' : 'text-zinc-300'}`}>{label}</div>
                <div className="text-[10.5px] text-zinc-500 leading-snug mt-0.5">{hint}</div>
              </button>
            ))}
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#A79CBF] uppercase tracking-wider">
                {kind === 'vet' ? 'Full name' : 'Your Name'}
              </label>
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

            {kind === 'vet' && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#A79CBF] uppercase tracking-wider">Practice (optional)</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A79CBF]" />
                    <Input
                      value={practice}
                      onChange={e => setPractice(e.target.value)}
                      placeholder="e.g. Greenside Animal Hospital"
                      className="pl-10 bg-[#0D0A14] border-white/10 focus:border-[#FFAE6D]/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#A79CBF] uppercase tracking-wider">Registration number</label>
                  <div className="relative">
                    <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A79CBF]" />
                    <Input
                      value={registration}
                      onChange={e => setRegistration(e.target.value)}
                      placeholder="Your professional register number"
                      className="pl-10 bg-[#0D0A14] border-white/10 focus:border-[#FFAE6D]/50"
                    />
                  </div>
                  <p className="text-[10.5px] text-zinc-500 leading-relaxed">
                    Checked by an administrator before you can answer questions. You can sign in and use every
                    owner-facing tool straight away.
                  </p>
                </div>
              </>
            )}

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

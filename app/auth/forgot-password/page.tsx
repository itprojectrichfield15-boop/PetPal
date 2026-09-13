'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Mail, ArrowLeft, MailCheck, PawPrint } from 'lucide-react'
import Logo from '@/components/public/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

/**
 * Password reset request.
 *
 * The sign-in page linked here already, but the route didn't exist — the link
 * 404'd. Sends a Supabase recovery email that returns through /auth/callback.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) { toast.error('Enter the email address on your account'); return }
    setLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
      })
      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }
      // Always show the same confirmation, whether or not the address exists,
      // so this page can't be used to discover which emails are registered.
      setSent(true)
    } catch (err) {
      toast.error(
        err instanceof Error && err.message.includes('not configured')
          ? 'Password reset is unavailable right now. Please try again later.'
          : 'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0C0A0A] flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-full opacity-30" aria-hidden="true" />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,122,107,0.08) 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <Logo size={38} glow />
          <span className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Paw<span className="text-[#FF7A6B]">Pal</span>
          </span>
        </div>

        <div className="p-8 glass-card rounded-2xl">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#FF7A6B]/12 border border-[#FF7A6B]/25 flex items-center justify-center mx-auto mb-5">
                <MailCheck className="w-7 h-7 text-[#FF7A6B]" />
              </div>
              <h1 className="text-2xl font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                Check your inbox
              </h1>
              <p className="text-sm text-[#A79F9C] leading-relaxed mb-6">
                If an account exists for <span className="text-white">{email.trim()}</span>, we&rsquo;ve sent a link to
                reset your password. It expires in an hour.
              </p>
              <Link href="/auth/login">
                <Button className="btn-glass-primary w-full h-11 rounded-xl">Back to sign in</Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-black mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                RESET PASSWORD
              </h1>
              <p className="text-[#A79F9C] mb-8 text-sm">
                Enter your email and we&rsquo;ll send you a link to set a new one.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="reset-email" className="text-xs font-semibold text-[#A79F9C] uppercase tracking-wider">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A79F9C] pointer-events-none" />
                    <Input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-10 bg-[#0C0A0A] border-white/10 focus:border-[#FF7A6B]/50"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-glass-primary h-12 text-base font-semibold rounded-xl"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-white/8 text-sm text-center">
                <Link href="/auth/login" className="text-[#A79F9C] hover:text-[#FF7A6B] transition-colors inline-flex items-center gap-1.5">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex items-start gap-3 p-4 rounded-xl bg-[#FF7A6B]/5 border border-[#FF7A6B]/20">
          <PawPrint className="w-4 h-4 text-[#FF7A6B] mt-0.5 shrink-0" />
          <p className="text-xs text-[#A79F9C] leading-relaxed">
            Your pets&rsquo; profiles and reminders stay exactly where you left them.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

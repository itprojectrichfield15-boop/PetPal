'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ArrowUpRight, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Logo from '@/components/public/Logo'

const NAV = [
  { label: 'Nutrition', href: '/nutrition' },
  { label: 'Food Safety', href: '/food-safety' },
  { label: 'Find a Vet', href: '/vet-finder' },
  { label: 'Wellness', href: '/wellness' },
  { label: 'Community', href: '/wall' },
  { label: 'Guides', href: '/resources' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <motion.nav
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl rounded-full transition-all duration-500',
          scrolled
            ? 'glass-strong border border-white/[0.08] shadow-[0_8px_40px_rgba(0,0,0,0.5)]'
            : 'border border-white/[0.06] bg-[#171226]/40 backdrop-blur-xl'
        )}
        aria-label="Primary"
      >
        <div className="flex items-center justify-between pl-3 pr-2 py-2">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="PetPal home">
            <Logo size={34} className="group-hover:scale-105 transition-transform duration-300" />
            <span className="text-base font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Pet<span className="text-[#FFAE6D]">Pal</span>
            </span>
          </Link>

          {/* Center nav — pill */}
          <div className="hidden lg:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => { try { localStorage.setItem('pp_chrome', 'site') } catch {} }}
                className="relative px-3.5 py-1.5 text-[13px] font-medium text-zinc-400 hover:text-white transition-colors duration-200 rounded-full group"
              >
                <span className="relative z-10">{item.label}</span>
                <span className="absolute inset-0 rounded-full bg-white/[0.06] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <Link href="/auth/login" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white text-[13px] h-9 px-3 rounded-full">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button
                size="sm"
                className="btn-glass-primary font-semibold gap-1.5 h-9 px-4 rounded-full text-[13px]"
              >
                Add Your Pet <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <button
              onClick={() => setOpen(true)}
              className="lg:hidden w-9 h-9 rounded-full border border-white/10 flex items-center justify-center"
              aria-label="Open menu"
            >
              <Menu className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md lg:hidden"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-72 bg-[#171226] border-l border-white/8 lg:hidden p-6"
            >
              <div className="flex items-center justify-between mb-8">
                <Logo size={32} variant="wordmark" />
                <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center" aria-label="Close menu">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {NAV.map(item => (
                  <Link key={item.href} href={item.href} onClick={() => { try { localStorage.setItem('pp_chrome', 'site') } catch {}; setOpen(false) }} className="flex items-center justify-between px-4 py-3 rounded-xl text-zinc-300 hover:bg-white/5 transition-colors">
                    <span>{item.label}</span>
                    <ArrowUpRight className="w-4 h-4 opacity-50" />
                  </Link>
                ))}
                <div className="h-px bg-white/5 my-4" />
                <Link href="/auth/login" onClick={() => setOpen(false)} className="px-4 py-3 rounded-xl text-zinc-300 hover:bg-white/5">
                  Sign In
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

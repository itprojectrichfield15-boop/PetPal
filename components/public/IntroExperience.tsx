'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { readSession, writeSession, KEYS } from '@/lib/storage'
import { useClientValue, usePrefersReducedMotion } from '@/lib/use-client-value'

/**
 * A cinematic, minimal intro shown once per session.
 * Two thought-provoking questions fade through automatically,
 * then the curtain lifts to reveal the site. Fully skippable.
 * No inputs — just a moment to think.
 */
const LINES = [
  'What if caring for them\nwas this simple?',
  'Everything your pet needs,\nin one place.',
]

const HOLD = 3400 // ms each line is visible

export default function IntroExperience() {
  const [index, setIndex] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduceMotion = usePrefersReducedMotion()

  // Read during render (a stable primitive) rather than setting state in an
  // effect — that produced a double render and a visible flash of the curtain.
  const alreadySeen = useClientValue(() => readSession(KEYS.introSeen) !== null, true)

  // Anyone who has asked for reduced motion skips the cinematic intro entirely.
  const [dismissed, setDismissed] = useState(false)
  const visible = !alreadySeen && !reduceMotion && !dismissed

  // Auto-advance the slideshow
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => {
      if (index < LINES.length - 1) setIndex(i => i + 1)
      else dismiss()
    }, HOLD)
    return () => clearTimeout(t)
  }, [visible, index])

  // Ambient flow-field canvas
  useEffect(() => {
    if (!visible) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0, h = 0
    interface Dot { x: number; y: number; speed: number; size: number }
    let dots: Dot[] = []

    function resize() {
      if (!canvas) return
      w = canvas.clientWidth; h = canvas.clientHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.floor((w * h) / 11000)
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        speed: 0.15 + Math.random() * 0.35, size: Math.random() * 1.5 + 0.3,
      }))
    }
    function tick(t: number) {
      if (!ctx) return
      ctx.clearRect(0, 0, w, h)
      for (const d of dots) {
        const angle = Math.sin((d.x + t * 0.0003) * 0.004) * 1.5 + Math.cos((d.y + t * 0.0002) * 0.004) * 1.5
        d.x += Math.cos(angle) * d.speed
        d.y += Math.sin(angle) * d.speed
        if (d.x < 0) d.x = w; if (d.x > w) d.x = 0
        if (d.y < 0) d.y = h; if (d.y > h) d.y = 0
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,122,107,${0.1 + d.size * 0.1})`
        ctx.fill()
      }
      raf = requestAnimationFrame(tick)
    }
    resize()
    raf = requestAnimationFrame(tick)
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [visible])

  function dismiss() {
    writeSession(KEYS.introSeen, '1')
    setDismissed(true)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(12px)', scale: 1.04 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] bg-[#040506] flex items-center justify-center overflow-hidden"
        >
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />
          <div className="absolute inset-0 bg-mesh-soft" aria-hidden="true" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] pointer-events-none animate-glow-pulse" aria-hidden="true"
            style={{ background: 'radial-gradient(ellipse, rgba(255,122,107,0.1) 0%, transparent 65%)' }} />
          <div className="absolute inset-0 grain" aria-hidden="true" />
          {/* Vignette */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
            style={{ background: 'radial-gradient(ellipse at center, transparent 40%, #040506 95%)' }} />

          {/* Skip */}
          <button
            onClick={dismiss}
            className="absolute top-7 right-7 z-10 text-[11px] uppercase tracking-[0.25em] text-white/35 hover:text-white/80 transition-colors flex items-center gap-2"
          >
            Skip <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Progress lines */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
            {LINES.map((_, i) => (
              <div key={i} className="h-[2px] w-10 rounded-full bg-white/10 overflow-hidden">
                {i === index && (
                  <motion.div
                    key={`bar-${index}`}
                    initial={{ width: '0%' }} animate={{ width: '100%' }}
                    transition={{ duration: HOLD / 1000, ease: 'linear' }}
                    className="h-full bg-[#FF7A6B]"
                  />
                )}
                {i < index && <div className="h-full w-full bg-[#FF7A6B]/40" />}
              </div>
            ))}
          </div>

          {/* The line — word-by-word reveal */}
          <div className="relative z-10 px-6 text-center max-w-4xl">
            <AnimatePresence mode="wait">
              <motion.h1
                key={index}
                exit={{ opacity: 0, y: -30, filter: 'blur(10px)' }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl md:text-6xl lg:text-7xl leading-[1.14] text-white/90"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                {LINES[index].split('\n').map((row, ri) => (
                  <span key={ri} className="block overflow-hidden">
                    <motion.span className="inline-block">
                      {row.split(' ').map((word, wi) => (
                        <motion.span
                          key={`${index}-${ri}-${wi}`}
                          initial={{ opacity: 0, y: 40, rotateX: 40 }}
                          animate={{ opacity: 1, y: 0, rotateX: 0 }}
                          transition={{
                            delay: 0.15 + (ri * 4 + wi) * 0.07,
                            duration: 0.7,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className="inline-block mr-[0.28em]"
                          style={{ transformOrigin: 'bottom' }}
                        >
                          {word}
                        </motion.span>
                      ))}
                    </motion.span>
                  </span>
                ))}
              </motion.h1>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

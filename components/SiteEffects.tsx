'use client'

import { useEffect, useRef } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'
import { useIsCoarsePointer, usePrefersReducedMotion } from '@/lib/use-client-value'

/**
 * Site-wide effects:
 *  - top scroll-progress gradient bar
 *  - a soft glow that trails the cursor on dark surfaces
 *
 * Smooth scrolling is native CSS (`scroll-behavior` in globals.css); the Lenis
 * library was removed because it hijacked and broke native scroll on touch
 * devices and inside scrollable panels.
 */
export default function SiteEffects() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 })
  const glowRef = useRef<HTMLDivElement>(null)
  const coarsePointer = useIsCoarsePointer()
  const reduceMotion = usePrefersReducedMotion()
  const showGlow = !coarsePointer && !reduceMotion

  // Cursor glow — pointer devices only, and never when reduced motion is on.
  useEffect(() => {
    if (!showGlow) return
    function move(e: MouseEvent) {
      if (!glowRef.current) return
      glowRef.current.style.transform = `translate(${e.clientX - 250}px, ${e.clientY - 250}px)`
    }
    window.addEventListener('mousemove', move, { passive: true })
    return () => window.removeEventListener('mousemove', move)
  }, [showGlow])

  return (
    <>
      {/* Scroll progress */}
      <motion.div
        style={{ scaleX }}
        className="fixed top-0 left-0 right-0 h-[3px] origin-left z-[60] bg-gradient-to-r from-primary via-[#FFD98E] to-[#8E8BF5]"
        aria-hidden="true"
      />
      {/* Cursor glow */}
      {showGlow && (
        <div
          ref={glowRef}
          className="fixed top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none z-[5] mix-blend-screen will-change-transform"
          style={{ background: 'radial-gradient(circle, rgba(255,174,109,0.07) 0%, transparent 60%)' }}
          aria-hidden="true"
        />
      )}
    </>
  )
}

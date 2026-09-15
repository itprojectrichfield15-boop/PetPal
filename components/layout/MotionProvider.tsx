'use client'

import { useEffect, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { KEYS, readRaw } from '@/lib/storage'
import { PREFS_CHANGED } from './PreferencesProvider'

/**
 * Makes the in-app "Reduce motion" setting actually stop the animations.
 *
 * ── Why CSS was not enough ──────────────────────────────────────────────────
 * The setting adds a `reduce-motion` class that drives
 * `transition-duration: 0.01ms !important` across the document, which does stop
 * every CSS transition. It has no effect whatsoever on Framer Motion, which is
 * what animates almost everything here — the scroll reveals, the navbar, the
 * accordions. Framer does not use CSS transitions; it writes `opacity` and
 * `transform` as inline styles and steps them itself each frame, so a CSS rule
 * about transition duration never enters into it.
 *
 * The result was a setting that reported success, visibly killed the small
 * hover transitions, and left every large movement on the page running.
 *
 * `MotionConfig reducedMotion="always"` is Framer's own switch for this: it
 * drops transform and layout animation while keeping opacity, so content still
 * fades in rather than appearing with a jolt.
 *
 * "user" — the other setting — follows the operating system, which is the right
 * default for anyone who has never opened PetPal's own setting.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    function read() {
      try {
        const raw = readRaw(KEYS.prefs)
        const prefs = raw ? JSON.parse(raw) : null
        setReduced(prefs?.reduceMotion === true)
      } catch {
        setReduced(false)
      }
    }
    read()
    window.addEventListener(PREFS_CHANGED, read)
    window.addEventListener('storage', read)
    return () => {
      window.removeEventListener(PREFS_CHANGED, read)
      window.removeEventListener('storage', read)
    }
  }, [])

  return <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>{children}</MotionConfig>
}

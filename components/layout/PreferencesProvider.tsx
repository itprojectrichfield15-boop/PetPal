'use client'

import { useEffect } from 'react'
import { KEYS, readRaw } from '@/lib/storage'

/**
 * Applies the user's saved appearance preferences to the document.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 * The Appearance settings were decorative. Choosing an accent colour wrote a
 * hex to localStorage and nothing ever read it back; "Reduce motion" and "High
 * contrast" saved a boolean and changed nothing at all. Three settings that
 * showed a success toast and did nothing — which is worse than not offering
 * them, because the user believes the app is now doing something it isn't.
 *
 * Every accent usage in the app was converted from a hard-coded `#FFAE6D` to
 * Tailwind's `primary` token, which resolves to the `--primary` CSS variable.
 * Setting that one variable here re-colours the whole interface, and opacity
 * modifiers like `bg-primary/12` keep working because Tailwind still knows it
 * is a colour.
 *
 * Runs on mount and then whenever settings broadcasts a change, so the
 * interface updates the moment a swatch is clicked rather than on next reload.
 */

/** Broadcast name used by the settings screen to request a re-apply. */
export const PREFS_CHANGED = 'petpal:prefs-changed'

/**
 * A readable foreground for text sitting on top of the accent.
 *
 * Every swatch offered is a light pastel, so a dark ink reads on all of them.
 * Computed from luminance rather than assumed, so a darker accent added later
 * still gets a legible pairing.
 */
function inkFor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#2A1A08'
  const n = parseInt(m[1], 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.45 ? '#2A1A08' : '#FFFFFF'
}

export function applyPreferences() {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  const accent = readRaw(KEYS.accent)
  if (accent && /^#[0-9a-f]{6}$/i.test(accent)) {
    root.style.setProperty('--primary', accent)
    root.style.setProperty('--ring', accent)
    root.style.setProperty('--chart-1', accent)
    root.style.setProperty('--primary-foreground', inkFor(accent))
  } else {
    // Fall back to the stylesheet's own value rather than a second copy of it.
    root.style.removeProperty('--primary')
    root.style.removeProperty('--ring')
    root.style.removeProperty('--chart-1')
    root.style.removeProperty('--primary-foreground')
  }

  let prefs: Record<string, unknown> = {}
  try {
    const raw = readRaw(KEYS.prefs)
    if (raw) prefs = JSON.parse(raw) ?? {}
  } catch {
    prefs = {}
  }

  // These drive real CSS in globals.css, not just a saved boolean.
  root.classList.toggle('reduce-motion', prefs.reduceMotion === true)
  root.classList.toggle('high-contrast', prefs.highContrast === true)
}

export default function PreferencesProvider() {
  useEffect(() => {
    applyPreferences()
    const onChange = () => applyPreferences()
    window.addEventListener(PREFS_CHANGED, onChange)
    // Another tab changing settings should update this one too.
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener(PREFS_CHANGED, onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])

  return null
}

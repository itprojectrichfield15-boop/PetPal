/**
 * Safe localStorage access.
 *
 * Two problems this solves:
 *
 * 1. Direct `localStorage` calls throw in private-browsing modes, when a
 *    browser is set to block site data, and during SSR. Several screens called
 *    it bare, so a blocked-storage browser crashed the page instead of simply
 *    not remembering a preference.
 *
 * 2. The app was renamed PawPal -> PetPal. The old `pawpal_*` keys hold real
 *    user state on the live deployment (care-plan progress, settings, accent
 *    colour), so reads fall back to the legacy key and migrate it forward
 *    rather than silently starting everyone from scratch.
 */

const LEGACY_PREFIX = 'pawpal_'
const PREFIX = 'petpal_'

function available(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

/** Legacy key for a current key, or null when there isn't one. */
function legacyKeyFor(key: string): string | null {
  return key.startsWith(PREFIX) ? LEGACY_PREFIX + key.slice(PREFIX.length) : null
}

/**
 * Read a raw string. Falls back to the pre-rename key and migrates it forward
 * on first read, so existing users keep their saved state.
 */
export function readRaw(key: string): string | null {
  if (!available()) return null
  try {
    const current = window.localStorage.getItem(key)
    if (current !== null) return current

    const legacy = legacyKeyFor(key)
    if (!legacy) return null

    const old = window.localStorage.getItem(legacy)
    if (old === null) return null

    // Migrate forward, but keep the old key: a user who loads an older cached
    // build of the app shouldn't lose their data.
    try { window.localStorage.setItem(key, old) } catch {}
    return old
  } catch {
    return null
  }
}

/** Write a raw string. Silently no-ops when storage is unavailable. */
export function writeRaw(key: string, value: string): void {
  if (!available()) return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Quota exceeded or storage blocked — a lost preference is not worth an
    // exception that breaks the surrounding interaction.
  }
}

/** Remove a key and its legacy counterpart. */
export function remove(key: string): void {
  if (!available()) return
  try {
    window.localStorage.removeItem(key)
    const legacy = legacyKeyFor(key)
    if (legacy) window.localStorage.removeItem(legacy)
  } catch {}
}

/**
 * Read and JSON-parse a value, returning `fallback` when the key is missing,
 * storage is unavailable, or the stored value is corrupt.
 */
export function readJSON<T>(key: string, fallback: T): T {
  const raw = readRaw(key)
  if (raw === null) return fallback
  try {
    const parsed = JSON.parse(raw)
    return (parsed ?? fallback) as T
  } catch {
    // Corrupt entry (hand-edited, truncated, or written by an older build).
    // Drop it so it can't keep throwing on every visit.
    remove(key)
    return fallback
  }
}

/** JSON-stringify and store a value. */
export function writeJSON(key: string, value: unknown): void {
  try {
    writeRaw(key, JSON.stringify(value))
  } catch {
    // Value contained a circular reference — nothing sensible to store.
  }
}

/**
 * Session-scoped equivalents of readRaw/writeRaw.
 *
 * Used for things that should reset when the tab closes — the cinematic intro
 * shows once per visit, not once per lifetime.
 */
export function readSession(key: string): string | null {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return null
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeSession(key: string, value: string): void {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return
    window.sessionStorage.setItem(key, value)
  } catch {}
}

/** Canonical storage keys, so they can't drift apart across screens. */
export const KEYS = {
  carePlan: `${PREFIX}careplan`,
  prefs: `${PREFIX}prefs`,
  accent: `${PREFIX}accent`,
  wallLiked: `${PREFIX}wall_liked`,
  /** Which chrome (marketing nav vs app sidebar) the user last navigated with. */
  chrome: 'pp_chrome',
  introSeen: `${PREFIX}intro_seen`,
} as const

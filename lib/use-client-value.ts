'use client'

import { useSyncExternalStore } from 'react'

/** A store that never emits — the value is read once, at mount. */
const NEVER_CHANGES = () => () => {}

/**
 * Read a browser-only value (localStorage, `matchMedia`, `window.location`,
 * WebGL support…) safely during render.
 *
 * Several screens previously did this in a `useEffect` and called `setState`
 * synchronously in the effect body. That works, but it renders twice on every
 * mount — React commits the server/fallback value, then immediately re-renders
 * with the real one — which is what `react-hooks/set-state-in-effect` flags, and
 * what makes a remembered preference visibly flash on load.
 *
 * `useSyncExternalStore` is the primitive built for exactly this: React calls
 * `getServerSnapshot` on the server and during hydration, then `getSnapshot` on
 * the client, so there is no mismatch and no cascading render.
 *
 * IMPORTANT: `read` must return a stable, cached value — a primitive, or an
 * object identity that doesn't change between calls. Returning a fresh object
 * (`new Set(...)`, `JSON.parse(...)`) each time makes React re-render forever.
 * Read the raw string here and parse it in a `useMemo`.
 */
export function useClientValue<T>(read: () => T, serverFallback: T): T {
  return useSyncExternalStore(NEVER_CHANGES, read, () => serverFallback)
}

/** True once the component is running in the browser. */
export function useIsClient(): boolean {
  return useClientValue(() => true, false)
}

/**
 * Track a CSS media query. Unlike `useClientValue` this stays subscribed, so a
 * user toggling their OS "reduce motion" setting updates the UI live.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    callback => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', callback)
      return () => mql.removeEventListener('change', callback)
    },
    () => {
      try {
        return window.matchMedia(query).matches
      } catch {
        return false
      }
    },
    () => false
  )
}

/** `prefers-reduced-motion: reduce` — honour it everywhere motion is used. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

/** True on touch/pen devices where a cursor-following effect makes no sense. */
export function useIsCoarsePointer(): boolean {
  return useMediaQuery('(pointer: coarse)')
}

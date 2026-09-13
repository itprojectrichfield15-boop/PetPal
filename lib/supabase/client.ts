import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Whether Supabase credentials are present in this environment.
 *
 * Call this before `createClient()` when a feature should quietly fall back to
 * local/demo behaviour instead of erroring — e.g. a preview deployment or a
 * fresh clone with no `.env.local`. Previously `createBrowserClient(undefined!,
 * undefined!)` threw on import and took the whole page down with it.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey)
}

/** Browser Supabase client. Throws a readable error if env vars are missing. */
export function createClient() {
  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }
  return createBrowserClient(url, anonKey)
}

/**
 * Returns a client, or `null` when Supabase isn't configured.
 * Preferred at call sites that already have a sensible offline fallback.
 */
export function tryCreateClient() {
  return isSupabaseConfigured() ? createClient() : null
}

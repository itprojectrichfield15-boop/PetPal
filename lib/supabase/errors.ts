/**
 * Turn Supabase / network failures into something a person can act on.
 *
 * The browser reports a failed connection as the bare string "Failed to fetch",
 * which tells a user nothing and sent this project on a long detour. That error
 * almost never means "wrong password" — it means the request never reached
 * Supabase at all, which in practice is one of:
 *
 *   1. NEXT_PUBLIC_SUPABASE_URL is missing, misspelt, or has a typo in the
 *      project ref,
 *   2. the Supabase project was deleted, or is paused (free projects pause
 *      after a week of inactivity),
 *   3. the device is offline or a network is blocking the host.
 *
 * A wrong anon key does NOT produce this — that comes back as a clean 401 with
 * a JSON body, which is why "Failed to fetch" points at the URL or the project,
 * never the key.
 */

export interface FriendlyError {
  /** Short line for a toast title. */
  title: string
  /** What to actually do about it. */
  detail: string
  /** True when this is a configuration problem rather than user error. */
  isConfig: boolean
}

export function describeSupabaseError(err: unknown): FriendlyError {
  const raw =
    err instanceof Error ? err.message
      : typeof err === 'string' ? err
      : typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message: unknown }).message)
        : ''

  const msg = raw.toLowerCase()

  if (msg.includes('not configured')) {
    return {
      title: 'The app isn’t connected to its database',
      detail:
        'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are missing. See SETUP.md.',
      isConfig: true,
    }
  }

  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed')) {
    return {
      title: 'Can’t reach the database',
      detail:
        'The request never arrived. The Supabase project may be paused or deleted, the project URL may be wrong, or you may be offline. Open /setup to check.',
      isConfig: true,
    }
  }

  if (msg.includes('invalid login') || msg.includes('invalid credentials')) {
    return {
      title: 'That email and password don’t match an account',
      detail: 'Check for typos, or create an account if you haven’t yet.',
      isConfig: false,
    }
  }

  if (msg.includes('already registered') || msg.includes('already been registered')) {
    return {
      title: 'That email already has an account',
      detail: 'Try signing in instead, or reset your password.',
      isConfig: false,
    }
  }

  if (msg.includes('email not confirmed')) {
    return {
      title: 'Confirm your email first',
      detail: 'Open the link we sent you, then sign in.',
      isConfig: false,
    }
  }

  if (msg.includes('rate limit') || msg.includes('too many')) {
    return {
      title: 'Too many attempts',
      detail: 'Wait a minute and try again.',
      isConfig: false,
    }
  }

  if (msg.includes('password')) {
    return { title: 'Password problem', detail: raw, isConfig: false }
  }

  return {
    title: 'Something went wrong',
    detail: raw || 'Please try again.',
    isConfig: false,
  }
}

/** Result of a live connectivity probe, used by the /setup page. */
export interface HealthReport {
  urlPresent: boolean
  keyPresent: boolean
  urlLooksValid: boolean
  url: string | null
  /** Whether the Supabase auth endpoint answered at all. */
  reachable: boolean
  /** HTTP status from the probe, when we got one. */
  status: number | null
  /** True when the key was accepted. */
  keyAccepted: boolean
  message: string
}

/**
 * Probe the configured Supabase project without signing anyone in.
 *
 * Hits the auth health endpoint, which needs only the anon key and tells us
 * apart the three failure modes above.
 */
export async function checkSupabaseHealth(): Promise<HealthReport> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null

  const urlPresent = Boolean(url)
  const keyPresent = Boolean(key)
  const urlLooksValid = Boolean(url && /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/i.test(url.trim()))

  const base: HealthReport = {
    urlPresent, keyPresent, urlLooksValid, url,
    reachable: false, status: null, keyAccepted: false, message: '',
  }

  if (!urlPresent || !keyPresent) {
    return { ...base, message: 'One or both environment variables are missing.' }
  }
  if (!urlLooksValid) {
    return {
      ...base,
      message: 'The URL is set but does not look like a Supabase project URL (expected https://<ref>.supabase.co).',
    }
  }

  try {
    const res = await fetch(`${url!.replace(/\/$/, '')}/auth/v1/health`, {
      headers: { apikey: key! },
    })
    if (res.status === 401 || res.status === 403) {
      return { ...base, reachable: true, status: res.status, message: 'Project reachable, but the anon key was rejected.' }
    }
    return {
      ...base,
      reachable: true,
      status: res.status,
      keyAccepted: res.ok,
      message: res.ok ? 'Project reachable and the key was accepted.' : `Project answered with HTTP ${res.status}.`,
    }
  } catch {
    return {
      ...base,
      message: 'The project did not respond at all — it is most likely paused, deleted, or the URL is wrong.',
    }
  }
}

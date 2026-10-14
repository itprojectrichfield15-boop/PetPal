import type { User } from '@supabase/supabase-js'

/**
 * Is this user an administrator?
 *
 * Reads, in order:
 *  1. app_metadata.role — only settable server-side (service role / SQL),
 *  2. profiles.role     — only settable server-side, because the schema grants
 *                         users UPDATE on their display name and avatar only.
 *
 * It deliberately does NOT read user_metadata.role. Any signed-in user can
 * write their own user_metadata with `supabase.auth.updateUser({ data })`, so
 * trusting it let anyone open the admin console by typing one line into the
 * browser console. (The database's own is_admin() check would still have
 * refused their writes, but the screen should not claim access it lacks.)
 */
export async function isUserAdmin(user: User | null): Promise<boolean> {
  if (!user) return false

  if (user.app_metadata?.role === 'admin') return true

  try {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    return data?.role === 'admin'
  } catch {
    return false
  }
}
